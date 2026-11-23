# Music Room — API

Back-end de **Music Room**, une application mobile de playlists collaboratives (projet 42).
L'application mobile n'est qu'une télécommande : toutes les règles et les données vivent dans cette API.

Services implémentés :

- **Music Track Vote** : les participants proposent des titres et votent, le classement suit les votes.
- **Music Playlist Editor** : ajout, déplacement et suppression de titres en temps réel.

Stack : NestJS 11 · TypeScript · PostgreSQL (TypeORM) · JWT · Server-Sent Events pour le temps réel.

## Prérequis

- Docker et Docker Compose
- `make`
- Pour les scripts de test : `curl` et `jq`
- Node.js et npm uniquement pour lancer les tests et le lint hors Docker

## Configuration

Toute la configuration passe par un fichier `.env` à la racine. Il n'est **jamais committé** (il est dans le `.gitignore`).

```bash
# API
BCRYPT_SALT_ROUNDS=10
JWT_SECRET=<chaîne aléatoire longue, sans espace>

## OAuth
GOOGLE_CLIENT_ID=<client id Google>
GOOGLE_CLIENT_SECRET=<client secret Google>

# Envoi des codes de validation (compte Gmail + mot de passe d'application)
MAIL=<adresse gmail>
MAIL_PASSWORD=<mot de passe d'application Gmail>

# DB
POSTGRES_HOST=db            # nom du service dans docker-compose.yaml
POSTGRES_PORT=5432
POSTGRES_USER=<utilisateur>
POSTGRES_PASSWORD=<8 caractères minimum>
POSTGRES_DATABASE=<nom de la base>

# Données de démo (facultatif, voir « Données de démo »)
SEED_PASSWORD=<mot de passe des comptes de démo, 8 caractères minimum>
SEED_LATITUDE=48.8966       # lieu des soirées de démo, 42 Paris par défaut
SEED_LONGITUDE=2.3184
SEED_COUNT=0                # comptes générés en plus du scénario, 300 maximum
```

Toutes ces variables sont obligatoires, sauf les `SEED_*` : l'API refuse de démarrer s'il en manque une (validation dans `src/infrastructure/config/config.module.ts`).

N'ajoute **pas** `E2E_MODE` au `.env` : cette variable est réservée à `make test-e2e` (voir [Tests de bout en bout](#tests-de-bout-en-bout)).

`MAIL_PASSWORD` n'est **pas** le mot de passe du compte Gmail, mais un [mot de passe d'application](https://myaccount.google.com/apppasswords) (la validation en deux étapes doit être activée sur le compte).

## Lancer l'API

```bash
make start   # construit les images et démarre l'API, la base et Adminer (ENVIRONMENT=prod)
make dev     # pareil, en mode dev : comptes dev1 / dev2 (mot de passe 123), pour le développement iOS
make stop    # arrête et supprime les conteneurs
make re      # stop + rebuild + start (après un changement de dépendances ou de schéma)
make test-e2e  # lance les tests de bout en bout, puis relance l'API en mode normal
make seed    # recrée les données de démo (dates remises à maintenant)
make seed-clean  # supprime les données de démo
```

| Service | URL |
| --- | --- |
| API | http://localhost:3000/api/v1 |
| Adminer (interface web de la base) | http://localhost:8080 (serveur `db`, identifiants du `.env`) |

`make dev` lance l'API avec `ENVIRONMENT=dev`, pour le développement iOS :

- Au démarrage, deux comptes déjà vérifiés sont créés s'ils n'existent pas : **`dev1`** et **`dev2`**, mot de passe **`123`**. Il n'y a pas besoin de s'inscrire : `POST /identity/login {"username":"dev1","password":"123"}`. Deux comptes, pour tester les interactions (invitation, vote, amis).
- Le token de `dev1` / `dev2` est valable **30 jours**, au lieu de 60 minutes pour les autres comptes.
- L'authentification est la même qu'en prod : sans token, `401`.

Pour que ces comptes ne servent jamais en prod (leur mot de passe est public) :

- **Dans tout autre mode** (`make start`, `make test-e2e`), `dev1` et `dev2` sont **supprimés au démarrage**, avec tout ce qu'ils possèdent (playlists, musiques, votes, invitations, par cascade). Leurs données de test sont donc perdues à chaque `make start`.
- Un token dev est **refusé (401) hors du mode dev**, même s'il n'a pas expiré.

N'utilise jamais ce mode pour la correction.

### Données de démo

Pour montrer l'app avec du contenu (soutenance, tests iOS), l'API crée de faux utilisateurs avec leurs playlists, musiques, votes, amis et invitations.

- **Création automatique** au démarrage, en `prod` comme en `dev`, si elles n'existent pas encore et si `SEED_PASSWORD` est défini dans le `.env`. Jamais en mode `test` (`make test-e2e`).
- **`make seed`** les recrée de zéro. Les dates sont relatives au moment du seed (« en cours » = commencée il y a 1 h) : **relance `make seed` juste avant la soutenance**, sinon les soirées « en cours » seront terminées.
- **`make seed-clean`** les supprime. Pour qu'elles ne reviennent pas au démarrage suivant, retire `SEED_PASSWORD` du `.env`.
- **Connexion** : un des 12 pseudos ci-dessous, avec le mot de passe `SEED_PASSWORD`. Les comptes sont déjà vérifiés.
- **Lieu** : les playlists VOTE sont placées autour de `SEED_LATITUDE` / `SEED_LONGITUDE` (42 Paris par défaut). Pour tester chez soi, mets-y sa propre position, relance l'API (`make start` ou `make dev`) puis `make seed`. Les adresses affichées restent celles de Paris.

Comptes : `lea.dj`, `karim.beats`, `sofia.indie`, `hugo.rock`, `ines.jazz`, `tom.electro`, `maya.pop`, `yanis.rap`, `chloe.soul`, `nathan.metal`, `emma.folk`, `lucas.house`.

| Playlist | Owner | Ce qu'elle montre |
| --- | --- | --- |
| Soirée BDE 42 | `lea.dj` | VOTE **en cours** au 42 : classement par votes (égalité → la plus ancienne d'abord), historique de musiques jouées, `canJoinHere` sur place |
| Afterwork Bastille | `karim.beats` | VOTE en cours à ~6 km : listée par `/events` avec sa distance, mais `OUTSIDE_PLAYLIST_ZONE` au join |
| Festival de demain | `sofia.indie` | VOTE **à venir** : l'owner prépare la playlist, une invitation acceptée d'avance (`hugo.rock`), une en attente (`ines.jazz`) |
| Jazz du dimanche | `ines.jazz` | VOTE dans 3 jours, à 300 m : proche mais `PLAYLIST_NOT_STARTED` |
| Rooftop d'hier | `hugo.rock` | VOTE **terminée** : absente de `/public` et `/events`, visible dans `/me` de ses membres |
| Radio du campus | `tom.electro` | EDITOR `EVERYONE`, sans dates : ajout et déplacement à distance |
| Projet de groupe | `ines.jazz` | EDITOR `INVITED_ONLY` : `yanis.rap` a rejoint sans invitation, il lit mais `TRACK_ACTION_FORBIDDEN` |
| Anniversaire surprise de Léa | `chloe.soul` | EDITOR **privée** : invisible pour `lea.dj`, invitations en attente (dont une envoyée par `sofia.indie`, participante avec privilège) |

Côté social : des amitiés, et des demandes en attente vers `lea.dj` (de `nathan.metal` et `emma.folk`).

#### Plus de volume : `SEED_COUNT`

Pour la correction, `SEED_COUNT=<n>` (300 maximum, 0 par défaut) ajoute **n comptes générés** au scénario, avec du contenu proportionnel : **une playlist pour deux comptes**, chacune avec 2 à 8 participants, 3 à 12 musiques et des votes, plus ~3 amis par compte et quelques demandes d'ami.

- Les playlists générées mélangent VOTE / EDITOR, publiques / privées (~20 %), `EVERYONE` / `INVITED_ONLY` (~25 %), et des dates d'il y a 7 jours à dans 14 jours (en cours, à venir, terminées). Les VOTE sont dispersées jusqu'à **20 km** autour de `SEED_LATITUDE` / `SEED_LONGITUDE` : `/events` avec une position renvoie toute une gamme de distances.
- Les pseudos combinent un prénom et un style (`camille.funk`, `noah.lofi`…) ; même mot de passe `SEED_PASSWORD`.
- **Toujours les mêmes données** pour un même `SEED_COUNT` (générateur pseudo-aléatoire à graine fixe).
- Les comptes générés ne touchent **jamais** au scénario : ses 8 playlists et ses 12 personnages restent identiques.
- Changer `SEED_COUNT` demande de relancer l'API (`make start` / `make dev`) puis **`make seed`** : au démarrage, une démo déjà présente n'est pas recréée. Passer de 300 à 50 supprime bien les 250 comptes en trop (tous les comptes de démo partagent un préfixe d'identifiant réservé).
- Le plafond de 300 garde le seed assez court pour que l'API démarre dans le délai du healthcheck Docker.

En mode `dev`, si `dev1` et `dev2` existent, ils reçoivent leur propre contenu : `dev1` participe à « Soirée BDE 42 » et « Radio du campus », est ami avec `lea.dj`, a une invitation à « Anniversaire surprise de Léa » et une demande d'ami de `karim.beats` ; `dev2` a une invitation à « Festival de demain » et une demande d'ami de `lucas.house`.

Les comptes de démo ont des identifiants fixes et un email `@demo.music-room.local` : `make seed` et `make seed-clean` ne suppriment qu'eux (et tout ce qu'ils possèdent, par cascade), jamais un vrai compte. Si un vrai compte a déjà pris un de leurs pseudos, le seed refuse de tourner et l'indique dans les logs.

L'API tourne en mode watch : une modification dans `src/` est rechargée automatiquement, sans relancer les conteneurs.

Vérifier que l'API répond :

```bash
curl http://localhost:3000/api/v1/health
# → {"success":true}
```

Suivre les logs :

```bash
docker compose logs -f api
```

Le schéma de la base est synchronisé automatiquement depuis les entités (`synchronize: true`), sans migrations. Après un changement de schéma, un `make re` repart sur une base cohérente.

## Utiliser l'API

**Toutes les routes, leurs bodies et leurs erreurs sont documentés dans [`docs/ROUTES.md`](docs/ROUTES.md).**

Parcours minimal pour obtenir un token :

```bash
API=http://localhost:3000/api/v1
H='Content-Type: application/json'

# 1. Créer un compte : un code à 6 chiffres est envoyé par email
curl -X POST $API/identity/register -H "$H" \
  -d '{"username":"alice","email":"alice@example.com","password":"Str0ng-Password!"}'

# 2. Valider le compte avec le code reçu
curl -X POST $API/identity/verify -H "$H" \
  -d '{"username":"alice","otp_code":"123456"}'

# 3. Se connecter
curl -X POST $API/identity/login -H "$H" \
  -d '{"username":"alice","password":"Str0ng-Password!"}'
# → {"access_token":"..."}

# 4. Appeler une route protégée
curl $API/playlists/public -H "Authorization: Bearer <access_token>"
```

## Tests et qualité

```bash
npm install      # une fois, pour lancer les outils hors Docker
npm test         # tests unitaires (Jest)
npm run lint     # ESLint + Prettier (corrige ce qui peut l'être)
npm run build    # vérifie que le projet compile
```

Les tests unitaires n'ont besoin ni de la base ni de Docker : les use-cases sont testés avec des repositories en mémoire.

### Tests de bout en bout

Les scripts `scripts/test-*.sh` testent l'API qui tourne, avec de vraies requêtes HTTP (`curl`, `jq` et `docker` requis) :

```bash
make test-e2e
```

Cette commande :

1. relance l'API en **mode e2e** (`E2E_MODE=true`) ;
2. exécute tous les scripts et affiche le résultat de chacun ;
3. **relance toujours l'API en mode normal à la fin**, que les scripts réussissent, échouent ou soient interrompus (Ctrl+C).

Le code de sortie est `0` si tous les scripts passent, `1` sinon.

**Pourquoi un mode e2e ?** Un compte doit être validé avec le code reçu par email avant de pouvoir se connecter. Les scripts créent des dizaines de comptes avec de fausses adresses : ils ne peuvent pas lire ces emails, et les envoyer épuiserait le quota Gmail. En mode e2e, **aucun email n'est envoyé** et le code est écrit dans les logs (`E2E verification code account=<id> code=<code>`). Les scripts le lisent avec `docker logs`. Le reste de la vérification ne change pas : code aléatoire, expiration, nombre d'essais limité.

Garde-fous :

- **`make start` lance toujours le mode normal**, avec de vrais emails. C'est la commande à utiliser pour la correction : il n'y a rien à désactiver.
- **Ne mets jamais `E2E_MODE` dans le `.env`** : il serait actif à chaque `make start`.
- L'API **refuse de démarrer** avec `E2E_MODE=true` si `ENVIRONMENT=prod`.
- Quand le mode e2e est actif, l'API l'annonce au démarrage par un `WARN` dans les logs.

Un script peut aussi être lancé seul, **à condition que l'API soit déjà en mode e2e**. Sinon, il s'arrête en indiquant d'utiliser `make test-e2e` :

```bash
./scripts/test-friendship.sh [API_URL]   # défaut : http://localhost:3000/api/v1
```

## Organisation du code

Un dossier par module métier dans `src/` : `identity`, `social`, `music`, `playlist`. Chacun suit le même découpage, `domain/` (règles métier), `application/` (use-cases), `infrastructure/` (base de données, services externes) et `interface/http/` (contrôleurs et DTO).

## Logging

Le projet utilise uniquement le `Logger` de NestJS (`@nestjs/common`), sans dépendance supplémentaire.

### Qui logue quoi

| Couche | Ce qu'elle logue | Où |
| --- | --- | --- |
| **Domaine** | Rien : il reste indépendant de Nest | — |
| **HTTP** | Une ligne par requête : méthode, chemin, statut, code d'erreur, durée, compte | `src/interface/http/middleware/request-logger.middleware.ts` |
| **Filtre d'erreurs** | Les erreurs 500, avec leur stack | `src/interface/http/filters/http-exception.filter.ts` |
| **Use-cases** | Un événement métier par écriture **réussie** | `src/<module>/application/use-cases/` |
| **Infrastructure** | Les échecs techniques et les détails de fonctionnement | `src/<module>/infrastructure/` |

Les **erreurs métier** (`INVALID_OTP`, `PLAYLIST_NOT_FOUND`…) ne sont **pas** loguées dans les use-cases : le filtre dépose leur code dans `res.locals`, et la ligne de requête l'affiche. Chaque erreur n'apparaît ainsi qu'une fois.

Les use-cases de **lecture** (`list-*`, `get-*`, recherche) ne loguent rien : la ligne de requête suffit.

### Quel niveau utiliser

| Niveau | Quand l'utiliser | Exemples |
| --- | --- | --- |
| `error` | Quelque chose est cassé et demande une intervention : erreur inattendue, service externe en échec | Erreur 500, email non envoyé, ligne HTTP en 5xx |
| `warn` | La requête a été refusée, mais l'application fonctionne normalement. À surveiller en cas de répétition (abus, client mal codé) | Ligne HTTP en 4xx : `INVALID_CREDENTIALS`, `TOO_MANY_OTP_ATTEMPTS`, `TRACK_VERSION_CONFLICT` |
| `log` | Un événement métier qui a réussi et dont on veut garder la trace : qui a fait quoi | `Account registered`, `Track moved`, `Vote added`, `Stream opened`, ligne HTTP en 2xx/3xx, démarrage de l'API |
| `debug` | Un détail technique utile pour comprendre un comportement en développement, trop bavard en production | `Event published`, `Verification email sent` |
| `verbose` | Une trace très détaillée, à ajouter ponctuellement pendant un débogage. Pas de ligne permanente | — |

Si tu hésites, pose-toi ces questions :
1. Faut-il agir ? → `error`
2. Une requête a été refusée ? → `warn`
3. Est-ce un fait métier qu'on voudra retrouver ? → `log`
4. Ça n'intéresse que la personne qui débogue ? → `debug`

### Ce qu'on ne logue jamais

Mots de passe, hash, codes OTP, JWT, **adresses email**, body des requêtes, query string (les recherches des utilisateurs). On logue **des ids** : ils suffisent pour retrouver les données en base, et ce ne sont pas des données personnelles.

### Conventions

- **Un logger par classe**, déclaré comme un champ, pour ne pas toucher au constructeur (ni donc aux tests) :

  ```ts
  @Injectable()
  export class MoveTrackUseCase {
    private readonly logger = new Logger(MoveTrackUseCase.name);
  ```

- **Message court au passé, puis les ids en `clé=valeur`**, pour pouvoir les rechercher avec `grep` :

  ```ts
  this.logger.log(
    `Track moved playlist=${playlist.id} track=${input.trackId} version=${version} by=${input.accountId}`,
  );
  ```

- **Dans un use-case, on logue après l'écriture**, une fois qu'elle a réussi, jamais avant.
- **Une erreur rattrapée puis relancée** sous la forme d'une erreur métier est loguée en `error` avec l'erreur d'origine, sinon sa cause est perdue :

  ```ts
  } catch (error) {
    this.logger.error(`Verification email could not be sent account=${mail.accountId}`, error);
    throw new VerificationEmailNotSent();
  }
  ```

### Niveaux affichés selon l'environnement

Configurés dans `src/main.ts` d'après la variable `ENVIRONMENT` :

| `ENVIRONMENT` | Niveaux affichés |
| --- | --- |
| `dev` (`make dev`) | `error`, `warn`, `log`, `debug`, `verbose` |
| `test` (`make test-e2e`) | `error`, `warn`, `log` |
| `prod` (`make start`), ou variable absente | `error`, `warn`, `log` |

### Lire les logs

```bash
docker compose logs -f          # suivre les logs de l'API et de la base
```

Exemples de lignes :

```
[HTTP] POST /api/v1/identity/verify 401 INVALID_OTP 12ms account=-
[MoveTrackUseCase] Track moved playlist=… track=… version=3 by=…
[HTTP] GET /api/v1/playlists/…/events 200 184233ms account=… (closed by client)
```

`account=-` signifie que la requête n'avait pas de JWT valide (route publique ou token refusé).

### Dans les tests

Les logs sont coupés pendant `npm test` (`src/test-setup.ts`, référencé dans `setupFiles` de la config Jest). On ne teste pas le contenu des logs métier, seulement le comportement. Seul le middleware de requête a des tests sur ses lignes, parce que produire ces lignes est son rôle.

