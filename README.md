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
```

Toutes ces variables sont obligatoires : l'API refuse de démarrer s'il en manque une (validation dans `src/infrastructure/config/config.module.ts`).

N'ajoute **pas** `E2E_MODE` au `.env` : cette variable est réservée à `make test-e2e` (voir [Tests de bout en bout](#tests-de-bout-en-bout)).

`MAIL_PASSWORD` n'est **pas** le mot de passe du compte Gmail, mais un [mot de passe d'application](https://myaccount.google.com/apppasswords) (la validation en deux étapes doit être activée sur le compte).

## Lancer l'API

```bash
make start   # construit les images et démarre l'API, la base et Adminer
make stop    # arrête et supprime les conteneurs
make re      # stop + rebuild + start (après un changement de dépendances ou de schéma)
make test-e2e  # lance les tests de bout en bout, puis relance l'API en mode normal
```

| Service | URL |
| --- | --- |
| API | http://localhost:3000/api/v1 |
| Adminer (interface web de la base) | http://localhost:8080 (serveur `db`, identifiants du `.env`) |

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
| `dev` | `error`, `warn`, `log`, `debug`, `verbose` |
| `prod`, ou variable absente | `error`, `warn`, `log` |

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

