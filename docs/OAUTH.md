# Connexion Google sur iOS

Guide pour l'équipe iOS : comment brancher « Se connecter avec Google » sur l'API Music Room.
Le contrat de la route est dans [ROUTES.md](ROUTES.md#post-identitygoogle--public).

## Sommaire

- [Vue d'ensemble](#vue-densemble)
- [1. Configuration Google Cloud](#1-configuration-google-cloud)
- [2. Configuration du projet Xcode](#2-configuration-du-projet-xcode)
- [3. Implémentation](#3-implémentation)
- [4. Erreurs à gérer](#4-erreurs-à-gérer)
- [5. Session et déconnexion](#5-session-et-déconnexion)
- [6. Tester en local](#6-tester-en-local)
- [Références](#références)

---

## Vue d'ensemble

L'app n'ouvre aucune page de l'API et ne gère aucune redirection. Le SDK **Google Sign-In** affiche la fenêtre
de connexion Google. Il utilise pour cela
[`ASWebAuthenticationSession`](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession),
une feuille Safari gérée par le système :

- l'app ne voit jamais le mot de passe Google ;
- la session Google déjà ouverte dans Safari est réutilisée, souvent en un seul tap ;
- iOS demande à l'utilisateur d'autoriser l'app à utiliser `google.com` pour se connecter. C'est normal.

À la fin, le SDK renvoie un **`id_token`** : un JWT signé par Google qui prouve l'identité de l'utilisateur.
L'app l'envoie à l'API, qui le vérifie et renvoie **son propre `access_token`**. Ce token s'utilise ensuite
exactement comme celui de `POST /identity/login`.

```
 App iOS                         Google                          API Music Room
    │                               │                                  │
    │ GIDSignIn.signIn(...)         │                                  │
    │──────────────────────────────▶│ feuille Safari système           │
    │                               │ (l'utilisateur choisit son compte)
    │◀──────────────────────────────│ id_token (JWT signé par Google)  │
    │                                                                  │
    │ POST /identity/google { id_token } ─────────────────────────────▶│ vérifie signature, émetteur,
    │                                                                  │ expiration, destinataire,
    │                                                                  │ email vérifié
    │◀───────────────────────────────────────── 200 { access_token } ──│ trouve ou crée le compte
    │                                                                  │
    │ Authorization: Bearer <access_token> sur les autres routes ────▶│
```

Ce qu'il faut savoir côté API :

- **Première connexion** : l'API crée le compte, actif tout de suite et sans mot de passe. Le username est
  généré depuis l'email (`alice.martin@gmail.com` → `alicemartin`), avec 4 chiffres ajoutés s'il est déjà pris.
- **Connexions suivantes** : l'API retrouve le même compte, même si l'utilisateur a changé l'email de son compte Google.
- Un compte Google **ne peut pas** utiliser `login`, `verify`, `verify/resend` ni `password/forgot`.
  Dans l'app, il ne faut donc pas proposer « mot de passe oublié » à un utilisateur Google.
- Il n'y a pas de route d'inscription séparée : le même appel sert à la première connexion et aux suivantes.

---

## 1. Configuration Google Cloud

Tout se passe dans le **même projet** Google Cloud que l'API
([console](https://console.cloud.google.com/apis/credentials)), dans *APIs & Services → Credentials*.
Il faut **deux** clients OAuth :

| Client | Type | Qui l'utilise | Où |
| --- | --- | --- | --- |
| Client **Web** | *Web application* | L'API, qui vérifie que le token lui est destiné | `GOOGLE_CLIENT_ID` dans le `.env` de l'API, et `GIDServerClientID` dans l'app |
| Client **iOS** | *iOS* (avec le Bundle ID de l'app) | Le SDK, pour ouvrir la connexion | `GIDClientID` et le schéma d'URL dans l'app |

Le client Web existe déjà : demander son **client ID** à l'équipe back-end. Un client ID n'est pas secret,
il peut être mis dans l'app.

> ⚠️ Le **client secret** ne doit **jamais** se trouver dans l'app : une app iOS se décompile. Le flux décrit ici n'en a pas besoin.

> ⚠️ Sans `GIDServerClientID`, l'`id_token` est émis pour le client iOS. L'API le refuse alors avec `401 INVALID_GOOGLE_TOKEN`.

L'écran de consentement OAuth doit être configuré. Tant qu'il est en mode *Testing*, seuls les comptes Google
ajoutés comme *test users* peuvent se connecter.

---

## 2. Configuration du projet Xcode

### Ajouter le SDK

Dans Xcode, *File → Add Package Dependencies…*, ajouter `https://github.com/google/GoogleSignIn-iOS` puis
cocher les produits **GoogleSignIn** et **GoogleSignInSwift**, qui fournit le bouton SwiftUI.
Voir la doc Apple [Adding package dependencies to your app](https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app).

### Info.plist

```xml
<!-- Client ID iOS -->
<key>GIDClientID</key>
<string>1234-ios.apps.googleusercontent.com</string>

<!-- Client ID Web de l'API : c'est lui qui sera dans le "aud" de l'id_token -->
<key>GIDServerClientID</key>
<string>1234-web.apps.googleusercontent.com</string>

<!-- Schéma d'URL : le client ID iOS à l'envers, pour que Google puisse rendre la main à l'app -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.1234-ios</string>
    </array>
  </dict>
</array>
```

Le schéma inversé (*reversed client ID*) est affiché dans la console Google, sur la page du client iOS.
Voir la doc Apple [Defining a custom URL scheme for your app](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app).

---

## 3. Implémentation

Exemple en SwiftUI, avec async/await (iOS 15+, GoogleSignIn 7 ou plus). C'est un point de départ à adapter
à l'architecture de l'app.

### Transmettre l'URL de retour au SDK

```swift
import SwiftUI
import GoogleSignIn

@main
struct MusicRoomApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                // Google rend la main à l'app par le schéma d'URL : le SDK doit le recevoir
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
```

### Le service d'authentification

```swift
import GoogleSignIn
import UIKit

struct AccessTokenResponse: Decodable {
    let access_token: String
}

// Format commun à toutes les erreurs de l'API
struct APIErrorResponse: Decodable, Error {
    let status: Int
    let error: String
    let message: String
}

enum GoogleSignInFailure: Error {
    case cancelled          // l'utilisateur a fermé la fenêtre Google
    case missingIdToken
    case api(APIErrorResponse)
}

final class AuthService {
    private let baseURL = URL(string: "https://api.example.com/api/v1")!

    // 1. Connexion Google, 2. échange de l'id_token contre le token de l'API
    @MainActor
    func signInWithGoogle(presenting viewController: UIViewController) async throws -> String {
        let result: GIDSignInResult
        do {
            result = try await GIDSignIn.sharedInstance.signIn(withPresenting: viewController)
        } catch let error as GIDSignInError where error.code == .canceled {
            throw GoogleSignInFailure.cancelled
        }

        guard let idToken = result.user.idToken?.tokenString else {
            throw GoogleSignInFailure.missingIdToken
        }
        return try await exchange(idToken: idToken)
    }

    private func exchange(idToken: String) async throws -> String {
        var request = URLRequest(url: baseURL.appendingPathComponent("identity/google"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["id_token": idToken])

        let (data, response) = try await URLSession.shared.data(for: request)
        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

        guard statusCode == 200 else {
            let apiError = try JSONDecoder().decode(APIErrorResponse.self, from: data)
            throw GoogleSignInFailure.api(apiError)
        }
        let body = try JSONDecoder().decode(AccessTokenResponse.self, from: data)
        return body.access_token
    }
}
```

### Le bouton

```swift
import SwiftUI
import GoogleSignInSwift

struct LoginView: View {
    let authService = AuthService()

    var body: some View {
        GoogleSignInButton(action: signIn)
    }

    private func signIn() {
        // Le SDK a besoin d'un view controller pour présenter la feuille Safari
        guard let rootViewController = UIApplication.shared.connectedScenes
            .compactMap({ ($0 as? UIWindowScene)?.keyWindow?.rootViewController })
            .first else { return }

        Task {
            do {
                let accessToken = try await authService.signInWithGoogle(presenting: rootViewController)
                // Stocker accessToken dans le Keychain, puis passer à l'écran principal
            } catch GoogleSignInFailure.cancelled {
                // Rien à afficher
            } catch {
                // Voir « Erreurs à gérer »
            }
        }
    }
}
```

Le token de l'API se stocke dans le **Keychain**, pas dans `UserDefaults`.
Voir la doc Apple [Keychain services](https://developer.apple.com/documentation/security/keychain-services).

---

## 4. Erreurs à gérer

| Cas | Réponse | Que faire dans l'app |
| --- | --- | --- |
| L'utilisateur ferme la fenêtre Google | `GIDSignInError.canceled` (SDK, pas d'appel à l'API) | Rien, rester sur l'écran de connexion |
| Succès | `200 { access_token }` | Stocker le token, aller à l'écran principal |
| Body invalide | `400 ID_TOKEN_INVALID` | Bug de l'app : le token n'a pas été envoyé correctement |
| Token refusé | `401 INVALID_GOOGLE_TOKEN` | Token expiré, ou `GIDServerClientID` mal configuré. Réessayer une fois après `refreshTokensIfNeeded()` (voir plus bas), sinon afficher « Connexion Google impossible » |
| Email déjà utilisé | `409 EMAIL_ALREADY_EXISTS` | Un compte a déjà été créé avec cet email via l'inscription classique. Afficher « Un compte existe déjà avec cet email, connecte-toi avec ton username et ton mot de passe ». La liaison des deux comptes n'existe pas encore |

---

## 5. Session et déconnexion

- **Le token de l'API expire au bout de 60 minutes** et l'API n'a pas de refresh token. Quand une route répond
  `401 UNAUTHORIZED`, l'app peut reconnecter un utilisateur Google **sans rien lui afficher** : elle restaure
  la session Google, rafraîchit l'`id_token` (lui aussi expire au bout d'une heure), puis rappelle
  `POST /identity/google`.

  ```swift
  func silentGoogleSignIn() async throws -> String {
      let user = try await GIDSignIn.sharedInstance.restorePreviousSignIn()
      let refreshedUser = try await user.refreshTokensIfNeeded()
      guard let idToken = refreshedUser.idToken?.tokenString else {
          throw GoogleSignInFailure.missingIdToken
      }
      return try await exchange(idToken: idToken)
  }
  ```

  Si `restorePreviousSignIn()` échoue, l'utilisateur n'est plus connecté à Google : il faut revenir à l'écran de connexion.

- **Déconnexion** : supprimer le token de l'API du Keychain **et** appeler `GIDSignIn.sharedInstance.signOut()`.
  Sinon la reconnexion silencieuse ci-dessus reconnecterait l'utilisateur tout seul.

---

## 6. Tester en local

- **Simulateur** : `http://localhost:3000/api/v1` fonctionne directement.
- **iPhone réel** : `localhost` désigne le téléphone, pas le Mac. Il faut utiliser l'IP du Mac sur le réseau
  local (par exemple `http://192.168.1.20:3000/api/v1`), avec le téléphone sur le même Wi-Fi.
- **HTTP** : App Transport Security bloque le HTTP. En développement uniquement, on autorise le réseau local :

  ```xml
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
  </dict>
  ```

  Voir la doc Apple [NSAppTransportSecurity](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity).

- Pour tester l'API sans l'app, on peut obtenir un vrai `id_token` avec l'
  [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) :
  1. dans ⚙, cocher « Use your own OAuth credentials » et saisir le client ID et le secret du client **Web** ;
     l'URL du Playground doit figurer dans les *Authorized redirect URIs* de ce client ;
  2. choisir les scopes `openid` et `email`, autoriser, puis cliquer sur *Exchange authorization code for tokens* ;
  3. copier `id_token` et l'envoyer :

  ```bash
  curl -s -X POST http://localhost:3000/api/v1/identity/google \
    -H 'Content-Type: application/json' -d '{"id_token":"<id_token>"}'
  ```

---

## Références

**Apple**

- [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession) : la fenêtre de connexion système utilisée par le SDK
- [Authenticating a user through a web service](https://developer.apple.com/documentation/authenticationservices/authenticating-a-user-through-a-web-service) : le principe d'une connexion via un service web
- [Defining a custom URL scheme for your app](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)
- [Adding package dependencies to your app](https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app)
- [Keychain services](https://developer.apple.com/documentation/security/keychain-services)
- [NSAppTransportSecurity](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity)
- [App Review Guidelines, 4.8 Login Services](https://developer.apple.com/app-store/review/guidelines/#login-services) : pour une publication sur l'App Store, une app qui propose une connexion tierce doit aussi proposer une option équivalente qui protège la vie privée, comme Sign in with Apple. Cela ne concerne pas le projet tant qu'il n'est pas publié.

**Google**

- [Get started with Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start-integrating)
- [Integrating Google Sign-In into your iOS app](https://developers.google.com/identity/sign-in/ios/sign-in)
- [Authenticate with a backend server](https://developers.google.com/identity/sign-in/ios/backend-auth) : le flux utilisé ici, où l'app envoie l'`id_token` au back-end
- [GoogleSignIn-iOS sur GitHub](https://github.com/google/GoogleSignIn-iOS)
