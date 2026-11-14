# Music Room API — Routes

- Toutes les routes sont préfixées par `/api/v1` (omis dans les titres ci-dessous).
- Sauf mention **public**, elles exigent le header `Authorization: Bearer <access_token>`, sauf en [mode dev](#mode-dev-make-dev).
- Toutes les erreurs ont la même forme :

  ```ts
  {
    status: number   // identique au statut HTTP
    error: string    // code stable, à utiliser côté client (ex. "PLAYLIST_NOT_FOUND")
    message: string  // texte lisible, en anglais
  }
  ```

- Erreurs transverses, possibles sur toutes les routes :

  | Statut | Réponse | Détail |
  | --- | --- | --- |
  | 400 | `<CHAMP>_…` | Body ou query invalide : voir [Erreurs de validation](#erreurs-de-validation) |
  | 400 | `UNKNOWN_FIELD` | Champ non prévu par la route (ex. `"property isAdmin should not exist"`) |
  | 400 | `INVALID_JSON` | Body qui n'est pas du JSON valide |
  | 413 | `PAYLOAD_TOO_LARGE` | Body de plus de 100 ko |
  | 401 | `UNAUTHORIZED` | Token absent, invalide ou expiré |
  | 404 | `NOT_FOUND` | Route inconnue |
  | 500 | `INTERNAL_SERVER_ERROR` | Erreur inattendue |

## Erreurs de validation

Quand un body ou une query string est invalide, l'API répond 400 avec un code propre au champ et à la règle
non respectée, par exemple :

```json
{ "status": 400, "error": "USERNAME_TOO_SHORT", "message": "username must be longer than or equal to 3 characters" }
```

- Une seule erreur est renvoyée : celle du **premier champ invalide**, dans l'ordre du body documenté pour la route. Les lignes 400 de chaque route suivent ce même ordre.
  Une fois ce champ corrigé, la requête suivante signale le suivant.
- Pour un champ donné, la vérification du type passe en premier : un champ absent ou du mauvais type donne
  `<CHAMP>_INVALID`, jamais `_TOO_SHORT` ou `_OUT_OF_RANGE`.
- `message` est le texte de class-validator, en anglais, pour le debug ; l'app s'appuie sur `error`.
- `VALIDATION_FAILED` reste possible en repli si une règle n'a pas de code (un test empêche ce cas).

| Code | Champ | Règle | Routes |
| --- | --- | --- | --- |
| `USERNAME_INVALID` | `username` | Absent ou pas une chaîne | register, login, verify, verify/resend, password/forgot, password/reset |
| `USERNAME_TOO_SHORT` | `username` | Moins de 3 caractères | register, verify, verify/resend, password/forgot, password/reset |
| `USERNAME_TOO_LONG` | `username` | Plus de 20 caractères | register, verify, verify/resend, password/forgot, password/reset |
| `EMAIL_INVALID` | `email` | Absent ou pas un email | register |
| `PASSWORD_INVALID` | `password` | Absent ou pas une chaîne | register, login |
| `PASSWORD_TOO_WEAK` | `password` | Moins de 12 caractères, ou sans minuscule, majuscule, chiffre et symbole | register |
| `PASSWORD_TOO_LONG` | `password` | Plus de 72 caractères | register |
| `OTP_CODE_INVALID` | `otp_code` | Pas exactement 6 chiffres | verify, password/reset |
| `NEW_PASSWORD_INVALID` | `new_password` | Absent ou pas une chaîne | password/reset |
| `NEW_PASSWORD_TOO_WEAK` | `new_password` | Mêmes règles que `PASSWORD_TOO_WEAK` | password/reset |
| `NEW_PASSWORD_TOO_LONG` | `new_password` | Plus de 72 caractères | password/reset |
| `ID_TOKEN_INVALID` | `id_token` | Absent, vide, pas une chaîne ou plus de 4096 caractères | google |
| `PLAYLIST_TYPE_INVALID` | `type` | Ni `VOTE` ni `EDITOR` | `POST /playlists` |
| `NAME_INVALID` | `name` | Absent ou pas une chaîne | `POST /playlists` |
| `NAME_TOO_SHORT` | `name` | Vide | `POST /playlists` |
| `NAME_TOO_LONG` | `name` | Plus de 100 caractères | `POST /playlists` |
| `DESCRIPTION_INVALID` | `description` | Absent ou pas une chaîne | `POST /playlists` |
| `DESCRIPTION_TOO_LONG` | `description` | Plus de 500 caractères | `POST /playlists` |
| `IS_PRIVATE_INVALID` | `isPrivate` | Pas un booléen | `POST /playlists` |
| `LICENSE_INVALID` | `license` | Ni `EVERYONE` ni `INVITED_ONLY` | `POST /playlists` |
| `BEGIN_AT_INVALID` | `beginAt` | Pas une date | `POST /playlists` |
| `END_AT_INVALID` | `endAt` | Pas une date | `POST /playlists` |
| `LATITUDE_INVALID` | `latitude` | Absent (quand obligatoire : création d'une playlist VOTE, ou `longitude` envoyée seule sur `GET /playlists/events`) ou pas un nombre | création, join, événements, actions sur les musiques |
| `LATITUDE_OUT_OF_RANGE` | `latitude` | Hors de -90..90 | création, join, événements, actions sur les musiques |
| `LONGITUDE_INVALID` | `longitude` | Absent (quand obligatoire : création d'une playlist VOTE, ou `latitude` envoyée seule sur `GET /playlists/events`) ou pas un nombre | création, join, événements, actions sur les musiques |
| `LONGITUDE_OUT_OF_RANGE` | `longitude` | Hors de -180..180 | création, join, événements, actions sur les musiques |
| `ACCOUNT_ID_INVALID` | `accountId` | Pas un UUID | `POST /playlists/:playlistId/invitations` |
| `HAS_PRIVILEGE_INVALID` | `hasPrivilege` | Pas un booléen | `PATCH /playlists/:playlistId/participants/:participantId` |
| `ROLE_INVALID` | `role` (query) | Ni `OWNER` ni `PARTICIPANT` | `GET /playlists/me` |
| `STATUS_INVALID` | `status` (query) | Ni `UPCOMING`, ni `LIVE`, ni `ENDED` | `GET /playlists/me` |
| `ORDER_INVALID` | `order` (query) | Ni `ASC` ni `DESC` | `GET /playlists/me` |
| `VIDEO_ID_INVALID` | `videoId` | Pas un id YouTube (11 caractères) | `POST /playlists/:playlistId/tracks` |
| `AFTER_TRACK_ID_INVALID` | `afterTrackId` | Absent, ou ni un UUID ni `null` | `PATCH …/tracks/:trackId/position` |
| `VERSION_INVALID` | `version` | Pas un entier ≥ 1 | `PATCH …/tracks/:trackId/position` |

## Mode dev (`make dev`)

Avec `ENVIRONMENT=dev`, le guard JWT laisse passer **toutes** les requêtes **sans lire le token**, même valide. L'API ne sait donc pas qui appelle.
Les routes qui ont besoin de l'utilisateur connecté ne fonctionnent pas. Selon la route, on obtient une `500 INTERNAL_SERVER_ERROR`, une erreur 4xx trompeuse ou une réponse incomplète.
`make start` (`ENVIRONMENT=prod`) rétablit l'authentification.

**Utilisables en mode dev** : toutes les routes **public**, plus :

- `GET /identity/profile`
- `GET /playlists/public`

**Inutilisables en mode dev** (elles ont besoin de l'utilisateur connecté) :

| Module | Routes |
| --- | --- |
| Social | `POST /social/friends/request/:receiverId`<br>`GET /social/friends/request/pending`<br>`POST /social/friends/request/:requestId/accept`<br>`DELETE /social/friends/request/:requestId/reject`<br>`DELETE /social/friends/request/:requestId/cancel` |
| Playlists | `POST /playlists`<br>`GET /playlists/me`<br>`GET /playlists/me/recent`<br>`GET /playlists/events`<br>`POST /playlists/:playlistId/join`<br>`POST /playlists/:playlistId/leave` |
| Invitations | `POST /playlists/:playlistId/invitations`<br>`GET /playlists/invitations`<br>`POST /playlists/invitations/:invitationId/accept`<br>`DELETE /playlists/invitations/:invitationId/decline`<br>`DELETE /playlists/invitations/:invitationId/cancel` |
| Participants | `GET /playlists/:playlistId/participants`<br>`PATCH /playlists/:playlistId/participants/:participantId`<br>`DELETE /playlists/:playlistId/participants/:participantId` |
| Musiques | `POST /playlists/:playlistId/tracks`<br>`GET /playlists/:playlistId/tracks`<br>`POST /playlists/:playlistId/tracks/:trackId/vote`<br>`DELETE /playlists/:playlistId/tracks/:trackId/vote`<br>`PATCH /playlists/:playlistId/tracks/:trackId/position`<br>`POST /playlists/:playlistId/tracks/:trackId/played`<br>`DELETE /playlists/:playlistId/tracks/:trackId` |
| Temps réel | `GET /playlists/:playlistId/events` (SSE) |

Une nouvelle route qui utilise `@UserIdParam()` doit être ajoutée à ce tableau.

## Sommaire

- [Erreurs de validation](#erreurs-de-validation)
- [Mode dev (`make dev`)](#mode-dev-make-dev)
- [Health](#health)
- [Identity](#identity)
- [Social](#social)
- [Music](#music)
- [Playlists](#playlists)
- [Invitations](#invitations)
- [Participants](#participants)
- [Musiques (tracks)](#musiques-tracks)
- [Temps réel (Server-Sent Events)](#temps-réel-server-sent-events)

---

## Health

### `GET /health` · public

| Statut | Réponse |
| --- | --- |
| 200 | `{ success: true }` |

---

## Identity

### `POST /identity/register` · public

```ts
// Body
{
  username: string  // 3-20 caractères
  email: string
  password: string  // 12-72 caractères, mot de passe fort
}
```

Crée un compte **inactif** et envoie par email un code de validation à 6 chiffres, valable 15 minutes. Le compte doit être validé via `POST /identity/verify` avant de pouvoir se connecter.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ id: string }` | |
| 400 | `USERNAME_INVALID` | Absent ou pas une chaîne |
| 400 | `USERNAME_TOO_SHORT` | Moins de 3 caractères |
| 400 | `USERNAME_TOO_LONG` | Plus de 20 caractères |
| 400 | `EMAIL_INVALID` | Absent ou pas un email |
| 400 | `PASSWORD_INVALID` | Absent ou pas une chaîne |
| 400 | `PASSWORD_TOO_WEAK` | Moins de 12 caractères, ou sans minuscule, majuscule, chiffre et symbole |
| 400 | `PASSWORD_TOO_LONG` | Plus de 72 caractères |
| 409 | `EMAIL_ALREADY_EXISTS` | Email déjà utilisé (signalé en premier si l'email et le username sont tous deux pris) |
| 409 | `USERNAME_ALREADY_EXISTS` | Username déjà utilisé |
| 503 | `VERIFICATION_EMAIL_NOT_SENT` | Le compte **est créé** mais l'email n'est pas parti : demander un nouveau code via `POST /identity/verify/resend` |

### `POST /identity/login` · public

```ts
// Body
{
  username: string
  password: string
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ access_token: string }` | |
| 400 | `USERNAME_INVALID` | Absent ou pas une chaîne |
| 400 | `PASSWORD_INVALID` | Absent ou pas une chaîne |
| 401 | `INVALID_CREDENTIALS` | Aussi pour un compte Google, qui n'a pas de mot de passe : il se connecte via `POST /identity/google` |
| 403 | `ACCOUNT_NOT_ACTIVE` | Bons identifiants, mais compte pas encore validé |

### `POST /identity/google` · public

Connexion avec Google. L'app obtient un `id_token` avec le SDK Google Sign-In (iOS : `GIDServerClientID` = le client ID **Web** de l'API, sinon le token est refusé), puis l'envoie ici. L'API vérifie le token auprès de Google (signature, émetteur, expiration, destinataire, email vérifié) et renvoie son propre `access_token`, comme `POST /identity/login`.

- **Première connexion** : crée un compte Google, actif tout de suite et sans mot de passe. Le username est généré depuis l'email (`alice.martin@gmail.com` → `alicemartin`), avec 4 chiffres ajoutés s'il est déjà pris (`alicemartin0427`).
- **Connexions suivantes** : le compte est retrouvé par l'identifiant Google, même si l'email du compte Google a changé.
- Un compte Google ne peut pas utiliser `login`, `verify`, `verify/resend` ni `password/forgot`.

```ts
// Body
{
  id_token: string  // ID token Google (JWT)
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | `{ access_token: string }` | Compte créé ou existant |
| 400 | `ID_TOKEN_INVALID` | Absent, vide, pas une chaîne ou plus de 4096 caractères |
| 401 | `INVALID_GOOGLE_TOKEN` | Token invalide, expiré, émis pour une autre app, ou email non vérifié par Google |
| 409 | `EMAIL_ALREADY_EXISTS` | L'email Google est celui d'un compte créé avec `register` : pas de liaison automatique, se connecter avec `login` |

### `POST /identity/verify` · public

Valide le compte avec le code reçu par email et **connecte l'utilisateur** : la réponse contient un `access_token`, comme `POST /identity/login`, donc pas besoin d'appeler `login` ensuite. Un compte Google est déjà validé.

```ts
// Body
{
  username: string  // 3-20 caractères
  otp_code: string  // exactement 6 chiffres
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ access_token: string }` | Compte validé et connecté |
| 400 | `USERNAME_INVALID` | Absent ou pas une chaîne |
| 400 | `USERNAME_TOO_SHORT` | Moins de 3 caractères |
| 400 | `USERNAME_TOO_LONG` | Plus de 20 caractères |
| 400 | `OTP_CODE_INVALID` | Absent ou pas exactement 6 chiffres |
| 401 | `INVALID_CREDENTIALS` | Username inconnu |
| 401 | `INVALID_OTP` | Code faux, expiré ou remplacé par un plus récent |
| 409 | `ACCOUNT_ALREADY_ACTIVE` | |
| 429 | `TOO_MANY_OTP_ATTEMPTS` | 5 codes faux pour ce code : en demander un nouveau |

### `POST /identity/verify/resend` · public

Génère un nouveau code (l'ancien devient invalide), remet le compteur d'essais à zéro et l'envoie par email.

**Anti-spam :** un seul code toutes les **60 secondes** par compte, à compter du dernier code envoyé (inscription comprise). Cela empêche d'inonder la boîte mail d'un utilisateur, et de contourner la limite de 5 essais en redemandant un code en boucle. Côté client, désactiver le bouton « Renvoyer le code » pendant 60 s.

```ts
// Body
{
  username: string  // 3-20 caractères
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | _(vide)_ | |
| 400 | `USERNAME_INVALID` | Absent ou pas une chaîne |
| 400 | `USERNAME_TOO_SHORT` | Moins de 3 caractères |
| 400 | `USERNAME_TOO_LONG` | Plus de 20 caractères |
| 401 | `INVALID_CREDENTIALS` | Username inconnu |
| 409 | `ACCOUNT_ALREADY_ACTIVE` | |
| 429 | `OTP_RESEND_TOO_SOON` | Moins de 60 s depuis le dernier code : aucun email envoyé, le code précédent reste valable |
| 503 | `VERIFICATION_EMAIL_NOT_SENT` | Nouveau code enregistré mais non envoyé : réessayer après 60 s |

### `POST /identity/password/forgot` · public

Mot de passe oublié, étape 1 : à partir du username, envoie un code à 6 chiffres, valable 15 minutes, à l'**email du compte** (jamais à une adresse fournie dans la requête), pour choisir un nouveau mot de passe.

**La réponse ne révèle jamais si le username a un compte** : même statut et même body (vide), sans attendre l'envoi du mail, pour un username inconnu, un compte Google, une demande trop rapprochée ou un échec d'envoi du mail. Côté client, afficher toujours « Si ce compte existe, un code vient d'être envoyé à son adresse email ».

- Une nouvelle demande remplace le code précédent (qui devient invalide) et remet le compteur d'essais à zéro.
- **Anti-spam :** une demande moins de **60 secondes** après le dernier code est ignorée (toujours 202, aucun email, le code précédent reste valable). Désactiver le bouton « Renvoyer le code » pendant 60 s.
- Les codes de reset sont distincts des codes de validation de compte : l'un ne fonctionne jamais à la place de l'autre.

```ts
// Body
{
  username: string  // 3-20 caractères
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 202 | _(vide)_ | Toujours, que le username ait un compte ou non |
| 400 | `USERNAME_INVALID` | Absent ou pas une chaîne |
| 400 | `USERNAME_TOO_SHORT` | Moins de 3 caractères |
| 400 | `USERNAME_TOO_LONG` | Plus de 20 caractères |

### `POST /identity/password/reset` · public

Mot de passe oublié, étape 2 : remplace le mot de passe avec le code reçu par email. L'app renvoie le username saisi à l'étape 1 ; le code et le nouveau mot de passe peuvent être saisis sur le même écran.

- Le code est à **usage unique** : si deux requêtes arrivent en même temps avec le bon code, une seule réussit.
- **5 essais** par code ; au-delà, même le bon code est refusé : en demander un nouveau via `POST /identity/password/forgot`.
- Un compte pas encore validé est **validé** par le reset (le code reçu par email prouve que l'adresse appartient à l'utilisateur).
- Un email « votre mot de passe a été modifié » est envoyé au titulaire du compte.
- Les tokens déjà délivrés restent valables jusqu'à leur expiration (60 min).

```ts
// Body
{
  username: string      // 3-20 caractères
  otp_code: string      // exactement 6 chiffres
  new_password: string  // 12-72 caractères, mot de passe fort
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 204 | _(vide)_ | Mot de passe changé, la connexion avec le nouveau est possible |
| 400 | `USERNAME_INVALID` | Absent ou pas une chaîne |
| 400 | `USERNAME_TOO_SHORT` | Moins de 3 caractères |
| 400 | `USERNAME_TOO_LONG` | Plus de 20 caractères |
| 400 | `OTP_CODE_INVALID` | Absent ou pas exactement 6 chiffres |
| 400 | `NEW_PASSWORD_INVALID` | Absent ou pas une chaîne |
| 400 | `NEW_PASSWORD_TOO_WEAK` | Moins de 12 caractères, ou sans minuscule, majuscule, chiffre et symbole |
| 400 | `NEW_PASSWORD_TOO_LONG` | Plus de 72 caractères |
| 401 | `INVALID_OTP` | Code faux, expiré, déjà utilisé ou remplacé par un plus récent, aucun reset demandé, ou username inconnu (même erreur, pour ne rien révéler) |
| 429 | `TOO_MANY_OTP_ATTEMPTS` | 5 codes faux pour ce code : en demander un nouveau |

### `GET /identity/profile`

| Statut | Réponse |
| --- | --- |
| 200 | `{ success: true }` |

---

## Social

### `POST /social/friends/request/:receiverId`

Envoyer une demande d'ami.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ requestId: string }` | |
| 400 | `SELF_FRIENDSHIP` | |
| 409 | `FRIENDSHIP_REQUEST_ALREADY_EXISTS` | Demande déjà en attente, dans un sens ou dans l'autre |
| 409 | `FRIENDSHIP_ALREADY_EXISTS` | |

### `POST /social/friends/request/:requestId/accept`

Accepter une demande. Réservé au destinataire de la demande.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ friendshipId: string }` | |
| 404 | `FRIENDSHIP_REQUEST_NOT_FOUND` | Inconnue, ou l'appelant n'en est pas le destinataire |

### `GET /social/friends/request/pending`

Liste les demandes reçues par l'appelant, en attente de sa réponse.

```ts
// 200
{
  requests: {
    id: string
    senderId: string
    receiverId: string
  }[]
}
```

### `DELETE /social/friends/request/:requestId/reject`

Refuser une demande reçue. Réservé au destinataire de la demande.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | *(vide)* | |
| 404 | `FRIENDSHIP_REQUEST_NOT_FOUND` | Inconnue, ou l'appelant n'en est pas le destinataire |

### `DELETE /social/friends/request/:requestId/cancel`

Annuler une demande envoyée. Réservé à l'émetteur de la demande.

| Statut | Réponse |
| --- | --- |
| 200 | *(vide)* |
| 404 | `FRIENDSHIP_REQUEST_NOT_FOUND` |

---

## Music

### `GET /music/search/:name` · public

```ts
// 200
{
  musics: {
    name: string
    videoId: string
    artist: string
    thumbnail: string | null
    duration: number | null  // en secondes ; null quand YouTube ne la fournit pas
  }[]
}
```

---

## Playlists

### `POST /playlists`

Créer une playlist. Seule une playlist **VOTE** a une position : ses participants doivent être à 500 m maximum pour la rejoindre et agir sur ses musiques. Une playlist **EDITOR** est une collaboration à distance : elle n'a pas de position, et `latitude` / `longitude` ne doivent pas être envoyés.

```ts
// Body
{
  type: "VOTE" | "EDITOR"
  name: string              // 1-100 caractères
  description: string       // 500 caractères max
  isPrivate?: boolean       // défaut false
  license?: "EVERYONE" | "INVITED_ONLY"  // défaut "EVERYONE", voir Musiques
  beginAt?: string          // ISO 8601
  endAt?: string            // ISO 8601, dans le futur et strictement après beginAt
  latitude?: number         // -90..90, obligatoire pour VOTE, interdit pour EDITOR
  longitude?: number        // -180..180, obligatoire pour VOTE, interdit pour EDITOR
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ id: string }` | |
| 400 | `PLAYLIST_TYPE_INVALID` | Ni `VOTE` ni `EDITOR` |
| 400 | `NAME_INVALID` | Absent ou pas une chaîne |
| 400 | `NAME_TOO_SHORT` | Vide |
| 400 | `NAME_TOO_LONG` | Plus de 100 caractères |
| 400 | `DESCRIPTION_INVALID` | Absent ou pas une chaîne |
| 400 | `DESCRIPTION_TOO_LONG` | Plus de 500 caractères |
| 400 | `IS_PRIVATE_INVALID` | Pas un booléen |
| 400 | `LICENSE_INVALID` | Ni `EVERYONE` ni `INVITED_ONLY` |
| 400 | `BEGIN_AT_INVALID` | Pas une date |
| 400 | `END_AT_INVALID` | Pas une date |
| 400 | `LATITUDE_INVALID` | VOTE : absent ou pas un nombre |
| 400 | `LATITUDE_OUT_OF_RANGE` | VOTE : hors de -90..90 |
| 400 | `LONGITUDE_INVALID` | VOTE : absent ou pas un nombre |
| 400 | `LONGITUDE_OUT_OF_RANGE` | VOTE : hors de -180..180 |
| 400 | `LOCATION_NOT_ALLOWED` | EDITOR : `latitude` ou `longitude` envoyé, quelle que soit sa valeur |
| 400 | `INVALID_PLAYLIST_PERIOD` | |
| 400 | `PLAYLIST_END_IN_PAST` | |
| 409 | `PLAYLIST_ALREADY_EXISTS` | Même nom pour le même owner |

### `GET /playlists/public`

Liste les playlists publiques non terminées (celles qui n'ont pas encore commencé sont incluses).

```ts
// 200
{
  playlists: {
    id: string
    type: "VOTE" | "EDITOR"
    license: "EVERYONE" | "INVITED_ONLY"
    ownerId: string
    ownerUsername: string | null   // null si le compte est introuvable
    name: string
    description: string
    beginAt: string | null
    endAt: string | null
    latitude: number | null   // null pour une playlist EDITOR
    longitude: number | null  // null pour une playlist EDITOR
    coverPath: string | null
  }[]
}
```

### `GET /playlists/me?role=…&status=…&order=…`

Toutes les playlists de l'appelant : celles qu'il a créées et celles qu'il a rejointes, privées et terminées comprises.
Triées par date de création. Tous les paramètres sont optionnels.

```ts
// Query
{
  role?: "OWNER" | "PARTICIPANT"           // filtre, toutes par défaut
  status?: "UPCOMING" | "LIVE" | "ENDED"   // filtre, toutes par défaut
  order?: "ASC" | "DESC"                   // défaut DESC : la plus récente d'abord
}
```

```ts
// 200
{
  playlists: {
    id: string
    type: "VOTE" | "EDITOR"
    license: "EVERYONE" | "INVITED_ONLY"
    ownerId: string
    name: string
    description: string
    isPrivate: boolean
    beginAt: string | null
    endAt: string | null
    latitude: number | null   // null pour une playlist EDITOR
    longitude: number | null  // null pour une playlist EDITOR
    coverPath: string | null
    createdAt: string
    status: "UPCOMING" | "LIVE" | "ENDED"   // LIVE pour une playlist sans dates
    role: "OWNER" | "PARTICIPANT"
    hasPrivilege: boolean     // toujours true pour le propriétaire
  }[]
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 400 | `ROLE_INVALID` | |
| 400 | `STATUS_INVALID` | |
| 400 | `ORDER_INVALID` | |

### `GET /playlists/me/recent`

Les 10 dernières playlists créées par l'appelant, la plus récente d'abord (privées et terminées comprises).

```ts
// 200
{
  playlists: { ... }[]  // même format que GET /playlists/me, avec role toujours "OWNER"
}
```

### `GET /playlists/events?latitude=…&longitude=…`

Les 10 événements publics à découvrir. Un événement est une playlist **publique**, **avec une date de début** et **pas terminée** (celles en cours sont incluses).
Les playlists que l'appelant a créées ou rejointes sont exclues.

- **Sans position** : les plus proches dans le temps d'abord. Celles en cours passent donc avant celles à venir. Les deux types sont renvoyés.
- **Avec position** : les plus proches géographiquement d'abord, sans limite de distance. Seules les playlists **VOTE** sont renvoyées (une EDITOR n'a pas de position).

```ts
// Query
{
  latitude?: number    // -90..90, à envoyer avec longitude
  longitude?: number   // -180..180, à envoyer avec latitude
}
```

```ts
// 200
{
  events: {
    id: string
    type: "VOTE" | "EDITOR"
    license: "EVERYONE" | "INVITED_ONLY"
    ownerId: string
    ownerUsername: string | null   // null si le compte est introuvable
    name: string
    description: string
    beginAt: string           // jamais null pour un événement
    endAt: string | null
    latitude: number | null   // null pour une playlist EDITOR
    longitude: number | null  // null pour une playlist EDITOR
    coverPath: string | null
    status: "UPCOMING" | "LIVE"
    distanceMeters: number | null  // arrondie au mètre, null sans position
    canJoinHere: boolean      // le join passerait maintenant : en cours, et EDITOR ou à 500 m au plus
  }[]
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 400 | `LATITUDE_INVALID` | Pas un nombre, ou absente alors que `longitude` est envoyée |
| 400 | `LATITUDE_OUT_OF_RANGE` | Hors de -90..90 |
| 400 | `LONGITUDE_INVALID` | Pas un nombre, ou absente alors que `latitude` est envoyée |
| 400 | `LONGITUDE_OUT_OF_RANGE` | Hors de -180..180 |

### `POST /playlists/:playlistId/join`

Rejoindre une playlist publique en cours (commencée et non terminée).

- **VOTE** : il faut être à **500 m maximum** de sa position. Sans position, ou avec une seule coordonnée, l'appelant est considéré hors zone.
- **EDITOR** : pas de position à envoyer (body vide `{}` ou absent). Une position envoyée est ignorée.

```ts
// Body
{
  latitude?: number   // -90..90, nécessaire pour VOTE
  longitude?: number  // -180..180, nécessaire pour VOTE
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ participantId: string }` | |
| 400 | `LATITUDE_INVALID` | Pas un nombre |
| 400 | `LATITUDE_OUT_OF_RANGE` | Hors de -90..90 |
| 400 | `LONGITUDE_INVALID` | Pas un nombre |
| 400 | `LONGITUDE_OUT_OF_RANGE` | Hors de -180..180 |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 403 | `PRIVATE_PLAYLIST` | |
| 410 | `PLAYLIST_ENDED` | |
| 403 | `PLAYLIST_NOT_STARTED` | |
| 409 | `ALREADY_PARTICIPANT` | Déjà membre, ou owner de la playlist |
| 403 | `OUTSIDE_PLAYLIST_ZONE` | VOTE uniquement : à plus de 500 m, ou position absente |

### `POST /playlists/:playlistId/leave`

Quitter une playlist. Toujours possible, quelle que soit la période ou la position.
L'owner ne peut pas quitter sa propre playlist.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | *(vide)* | |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 404 | `PARTICIPANT_NOT_FOUND` | L'appelant n'est pas participant, ou est l'owner |

---

## Invitations

### `POST /playlists/:playlistId/invitations`

Inviter un compte. Réservé à l'owner et aux participants privilégiés, à tout moment et de n'importe où.

```ts
// Body
{
  accountId: string  // UUID
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ invitationId: string }` | |
| 400 | `ACCOUNT_ID_INVALID` | Absent ou pas un UUID |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 410 | `PLAYLIST_ENDED` | |
| 403 | `INVITATION_FORBIDDEN` | Ni owner, ni participant privilégié |
| 404 | `ACCOUNT_NOT_FOUND` | Compte invité inconnu |
| 409 | `ALREADY_PARTICIPANT` | Le compte invité est déjà membre, ou est l'owner |
| 409 | `INVITATION_ALREADY_EXISTS` | Une invitation est déjà en attente pour ce compte |

### `GET /playlists/invitations`

Liste les invitations reçues par l'appelant, en attente de sa réponse.

```ts
// 200
{
  invitations: {
    id: string
    playlistId: string
    playlistName: string
    playlistType: "VOTE" | "EDITOR"
    inviterId: string
    inviterUsername: string | null
  }[]
}
```

### `POST /playlists/invitations/:invitationId/accept`

Accepter une invitation. Réservé à l'invité. Possible avant le début de la playlist et sans être sur place :
l'invité devient participant (sans privilège). Pour une playlist VOTE, il ne pourra agir sur les musiques
(ajout, suppression, vote) qu'une fois la playlist commencée et en étant à 500 m maximum.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ participantId: string }` | |
| 404 | `INVITATION_NOT_FOUND` | Inconnue, ou l'appelant n'est pas l'invité |
| 410 | `PLAYLIST_ENDED` | |
| 409 | `ALREADY_PARTICIPANT` | Déjà membre entre-temps |

### `DELETE /playlists/invitations/:invitationId/decline`

Refuser une invitation. Réservé à l'invité.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | *(vide)* | |
| 404 | `INVITATION_NOT_FOUND` | Inconnue, ou l'appelant n'est pas l'invité |

### `DELETE /playlists/invitations/:invitationId/cancel`

Annuler une invitation envoyée. Réservé à la personne qui a invité.

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | *(vide)* | |
| 404 | `INVITATION_NOT_FOUND` | Inconnue, ou l'appelant n'est pas celui qui a invité |

---

## Participants

### `GET /playlists/:playlistId/participants`

Réservé aux membres (owner et participants).

```ts
// 200
{
  owner: {
    accountId: string
    username: string | null
  }
  participants: {
    participantId: string
    accountId: string
    username: string | null
    hasPrivilege: boolean
  }[]
}
```

| Statut | Réponse |
| --- | --- |
| 404 | `PLAYLIST_NOT_FOUND` |
| 403 | `NOT_PLAYLIST_MEMBER` |

### `PATCH /playlists/:playlistId/participants/:participantId`

Donner ou retirer le privilège (inviter d'autres comptes). Réservé à l'owner.
Les invitations déjà envoyées par le participant restent valides.

```ts
// Body
{
  hasPrivilege: boolean
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | *(vide)* | |
| 400 | `HAS_PRIVILEGE_INVALID` | Absent ou pas un booléen |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 403 | `NOT_PLAYLIST_OWNER` | |
| 404 | `PARTICIPANT_NOT_FOUND` | |

### `DELETE /playlists/:playlistId/participants/:participantId`

Retirer un participant. Réservé à l'owner.

| Statut | Réponse |
| --- | --- |
| 200 | *(vide)* |
| 404 | `PLAYLIST_NOT_FOUND` |
| 403 | `NOT_PLAYLIST_OWNER` |
| 404 | `PARTICIPANT_NOT_FOUND` |

---

## Musiques (tracks)

Les routes de musiques servent aux deux types de playlists, avec des règles différentes.

### Règles communes

Elles s'appliquent aux actions : ajout, vote, retrait de vote, déplacement.

| Règle | VOTE | EDITOR |
| --- | --- | --- |
| Licence `EVERYONE` | Tous les membres (owner et participants) | Idem |
| Licence `INVITED_ONLY` | L'owner et les participants entrés par invitation (pas ceux entrés via `join`) | Idem |
| Présence d'un participant | Sur place : playlist commencée, non terminée, à 500 m maximum | À distance : aucune position, possible avant le début |
| Position (`latitude`, `longitude`) | Obligatoire pour un participant (absente = hors zone) | Inutile |
| Owner | À tout moment, de n'importe où (position facultative) | Idem |
| Playlist terminée | Bloque les actions | Idem |
| Limite | 200 musiques non jouées | 200 musiques |

### Erreurs communes

| Statut | Réponse | Détail |
| --- | --- | --- |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 403 | `NOT_PLAYLIST_MEMBER` | |
| 403 | `TRACK_ACTION_FORBIDDEN` | Exclu par la licence `INVITED_ONLY` |
| 410 | `PLAYLIST_ENDED` | |
| 403 | `PLAYLIST_NOT_STARTED` | VOTE uniquement |
| 403 | `OUTSIDE_PLAYLIST_ZONE` | VOTE uniquement |

### `POST /playlists/:playlistId/tracks`

Proposer une musique. Le serveur récupère lui-même titre, artiste, vignette et durée à partir du `videoId`.
EDITOR : la musique est ajoutée à la fin de la playlist (on la déplace ensuite si besoin).

```ts
// Body
{
  videoId: string     // id YouTube, 11 caractères
  latitude?: number   // -90..90
  longitude?: number  // -180..180
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ trackId: string }` | |
| 400 | `VIDEO_ID_INVALID` | Absent ou pas un id YouTube (11 caractères) |
| 400 | `LATITUDE_INVALID` | Pas un nombre |
| 400 | `LATITUDE_OUT_OF_RANGE` | Hors de -90..90 |
| 400 | `LONGITUDE_INVALID` | Pas un nombre |
| 400 | `LONGITUDE_OUT_OF_RANGE` | Hors de -180..180 |
| — | erreurs communes | |
| 404 | `MUSIC_NOT_FOUND` | `videoId` inconnu de YouTube |
| 409 | `TRACK_ALREADY_IN_PLAYLIST` | Déjà dans la playlist ; pour VOTE, elle peut revenir une fois jouée |
| 409 | `PLAYLIST_FULL` | 200 musiques en attente |

### `GET /playlists/:playlistId/tracks`

Playlist publique : tout le monde. Playlist privée : membres uniquement.
Le champ `type` indique la forme de la liste.

**VOTE** : classement des musiques non jouées, plus de votes d'abord, puis la plus anciennement ajoutée.

```ts
// 200
{
  type: "VOTE"
  tracks: {
    id: string
    videoId: string
    name: string
    artist: string
    thumbnail: string | null
    duration: number | null
    addedBy: string
    addedAt: string
    votes: number
    hasVoted: boolean  // l'appelant a voté pour cette musique
  }[]
}
```

**EDITOR** : musiques dans l'ordre de la playlist, avec leur version (à renvoyer pour les déplacer).

```ts
// 200
{
  type: "EDITOR"
  tracks: {
    id: string
    videoId: string
    name: string
    artist: string
    thumbnail: string | null
    duration: number | null
    addedBy: string
    addedAt: string
    version: number
  }[]
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 403 | `NOT_PLAYLIST_MEMBER` | Playlist privée |

### `PATCH /playlists/:playlistId/tracks/:trackId/position` · EDITOR uniquement

Déplacer une musique juste après une autre (`afterTrackId`), ou en tête (`afterTrackId: null`).

```ts
// Body
{
  afterTrackId: string | null  // UUID, obligatoire (null = en tête)
  version: number              // ≥ 1, version connue de la musique
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | `{ version: number }` | Nouvelle version de la musique |
| 400 | `AFTER_TRACK_ID_INVALID` | Absent, ou ni un UUID ni `null` |
| 400 | `VERSION_INVALID` | Absent, ou pas un entier ≥ 1 |
| — | erreurs communes | |
| 400 | `NOT_AN_EDITOR_PLAYLIST` | |
| 400 | `INVALID_MOVE` | Musique placée après elle-même |
| 404 | `TRACK_NOT_FOUND` | Musique ou `afterTrackId` inconnus dans cette playlist |
| 409 | `TRACK_VERSION_CONFLICT` | La musique a été déplacée entre-temps : recharger la liste |

> **Gestion des accès concurrents**
>
> - **Déplacement relatif** (« après la musique Y ») et non par index : deux personnes qui déplacent deux
>   musiques différentes en même temps voient leurs deux déplacements appliqués.
> - **Version par musique** (verrouillage optimiste) : l'écriture n'a lieu que si la version en base est encore
>   celle envoyée par le client (`UPDATE … WHERE version = ?`, atomique). Si deux personnes déplacent la même
>   musique en même temps, une seule réussit ; l'autre reçoit 409 et recharge la liste, rien n'est écrasé sans
>   le savoir.
> - **Positions fractionnaires** : la musique déplacée reçoit le milieu de ses deux voisines, les autres ne
>   bougent pas. Les modifications d'une même playlist sont sérialisées côté serveur (verrou par playlist,
>   en mémoire).

### `POST /playlists/:playlistId/tracks/:trackId/vote` · VOTE uniquement

Voter pour une musique (une seule fois, jamais pour une musique qu'on a proposée).

```ts
// Body
{
  latitude?: number
  longitude?: number
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ votes: number }` | |
| 400 | `LATITUDE_INVALID` | Pas un nombre |
| 400 | `LATITUDE_OUT_OF_RANGE` | Hors de -90..90 |
| 400 | `LONGITUDE_INVALID` | Pas un nombre |
| 400 | `LONGITUDE_OUT_OF_RANGE` | Hors de -180..180 |
| — | erreurs communes | |
| 400 | `NOT_A_VOTE_PLAYLIST` | |
| 404 | `TRACK_NOT_FOUND` | |
| 403 | `CANNOT_VOTE_OWN_TRACK` | |
| 409 | `ALREADY_VOTED` | |
| 409 | `TRACK_ALREADY_PLAYED` | |

### `DELETE /playlists/:playlistId/tracks/:trackId/vote?latitude=…&longitude=…` · VOTE uniquement

Retirer son vote. La position passe en query string (pas de body sur un `DELETE`).

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | `{ votes: number }` | |
| 400 | `LATITUDE_INVALID` | Pas un nombre |
| 400 | `LATITUDE_OUT_OF_RANGE` | Hors de -90..90 |
| 400 | `LONGITUDE_INVALID` | Pas un nombre |
| 400 | `LONGITUDE_OUT_OF_RANGE` | Hors de -180..180 |
| — | erreurs communes | |
| 400 | `NOT_A_VOTE_PLAYLIST` | |
| 404 | `TRACK_NOT_FOUND` | |
| 404 | `VOTE_NOT_FOUND` | |
| 409 | `TRACK_ALREADY_PLAYED` | |

### `DELETE /playlists/:playlistId/tracks/:trackId?latitude=…&longitude=…`

Supprimer une musique (et ses votes). La licence ne s'applique pas.

- **VOTE** : owner et participants privilégiés, avec les mêmes conditions de présence que les autres actions.
- **EDITOR** : owner, participants privilégiés et auteur de la musique, à distance (position inutile).

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | *(vide)* | |
| 400 | `LATITUDE_INVALID` | Pas un nombre |
| 400 | `LATITUDE_OUT_OF_RANGE` | Hors de -90..90 |
| 400 | `LONGITUDE_INVALID` | Pas un nombre |
| 400 | `LONGITUDE_OUT_OF_RANGE` | Hors de -180..180 |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 403 | `NOT_PLAYLIST_MEMBER` | |
| 404 | `TRACK_NOT_FOUND` | |
| 403 | `TRACK_DELETE_FORBIDDEN` | |
| 410 | `PLAYLIST_ENDED` | |
| 403 | `PLAYLIST_NOT_STARTED` | VOTE uniquement |
| 403 | `OUTSIDE_PLAYLIST_ZONE` | VOTE uniquement |
| 409 | `TRACK_ALREADY_PLAYED` | VOTE |

### `POST /playlists/:playlistId/tracks/:trackId/played` · VOTE uniquement

Marquer une musique comme jouée : elle sort du classement. Réservé à l'owner (l'appareil qui diffuse).
La musique est désignée par son id : deux appareils qui signalent la même musique n'en sautent pas deux.

| Statut | Réponse |
| --- | --- |
| 201 | *(vide)* |
| 404 | `PLAYLIST_NOT_FOUND` |
| 400 | `NOT_A_VOTE_PLAYLIST` |
| 403 | `NOT_PLAYLIST_OWNER` |
| 404 | `TRACK_NOT_FOUND` |
| 409 | `TRACK_ALREADY_PLAYED` |

---

## Temps réel (Server-Sent Events)

**Pourquoi SSE plutôt que WebSocket** : les actions passent déjà par l'API REST, le client a seulement besoin
d'être prévenu des changements (flux serveur → client). SSE est natif dans NestJS (aucune dépendance
supplémentaire), passe par le même guard JWT que le reste de l'API, et se lit côté iOS avec
`URLSession.bytes(for:)`.

### `GET /playlists/:playlistId/events`

Headers : `Accept: text/event-stream` et `Authorization: Bearer <access_token>` comme partout.
Mêmes droits que `GET /tracks` : playlist publique → tout le monde, privée → membres.

Les erreurs d'accès sont renvoyées en JSON classique, avant l'ouverture du flux :

| Statut | Réponse |
| --- | --- |
| 200 | Flux `text/event-stream` qui reste ouvert |
| 404 | `PLAYLIST_NOT_FOUND` |
| 403 | `NOT_PLAYLIST_MEMBER` |

#### Événements

Chaque message est une ligne `data: <JSON>`. Le JSON porte toujours un champ `type`.

| `type` | Champs | Playlist |
| --- | --- | --- |
| `track.added` | `playlistId`, `track`, `afterTrackId` | VOTE, EDITOR |
| `track.votes_changed` | `playlistId`, `trackId`, `votes` | VOTE |
| `track.moved` | `playlistId`, `trackId`, `afterTrackId`, `version` | EDITOR |
| `track.played` | `playlistId`, `trackId` | VOTE |
| `track.removed` | `playlistId`, `trackId` | VOTE, EDITOR |
| `heartbeat` | — | Toutes les 25 s, garde la connexion ouverte (à ignorer côté client) |

- `track.added` : `track` a la même forme que dans `GET /tracks` (sans `hasVoted`) : avec `votes` pour VOTE,
  `version` pour EDITOR. `afterTrackId` : EDITOR → musique après laquelle elle a été placée (`null` si
  première) ; VOTE → toujours `null`.
- `track.moved` : `afterTrackId: null` = en tête.

```text
data: {"type":"track.moved","playlistId":"…","trackId":"…","afterTrackId":"…","version":3}
```

#### Côté client

- Le flux ne rejoue pas le passé : charger d'abord l'état avec `GET /tracks`, puis appliquer les événements.
- iOS coupe la connexion quand l'app passe en arrière-plan : au retour au premier plan, recharger
  `GET /tracks` puis rouvrir le flux. Même chose après une coupure réseau (pas de heartbeat depuis plus de 25 s).
- EDITOR : appliquer `track.moved` en plaçant la musique après `afterTrackId`, et garder sa nouvelle `version`
  pour un prochain déplacement. Aucune position numérique n'est exposée : seul l'ordre compte.

> **Limite actuelle** : les événements (et le verrou des playlists EDITOR) vivent en mémoire dans le process
> de l'API ; ils ne sont partagés qu'entre les clients connectés à la même instance.
