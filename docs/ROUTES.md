# Music Room API — Routes

- Toutes les routes sont préfixées par `/api/v1` (omis dans les titres ci-dessous).
- Sauf mention **public**, elles exigent le header `Authorization: Bearer <access_token>`.
- Format des erreurs :
  - erreurs métier : `{ error: "CODE", message: string }` ;
  - erreurs de validation (400) et d'auth (401) : format Nest `{ statusCode, message, error }`.

## Sommaire

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

| Statut | Réponse |
| --- | --- |
| 201 | `{ id: string }` |
| 409 | `ACCOUNT_ALREADY_EXISTS` |

### `POST /identity/login` · public

```ts
// Body
{
  username: string
  password: string
}
```

| Statut | Réponse |
| --- | --- |
| 201 | `{ access_token: string }` |
| 401 | `INVALID_CREDENTIALS` |

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

Créer une playlist.

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
  latitude: number          // -90..90
  longitude: number         // -180..180
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ id: string }` | |
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
    name: string
    description: string
    beginAt: string | null
    endAt: string | null
    latitude: number
    longitude: number
    coverPath: string | null
  }[]
}
```

### `POST /playlists/:playlistId/join`

Rejoindre une playlist publique en cours (commencée et non terminée), en étant à **500 m maximum** de sa position.

```ts
// Body
{
  latitude: number   // -90..90
  longitude: number  // -180..180
}
```

| Statut | Réponse | Détail |
| --- | --- | --- |
| 201 | `{ participantId: string }` | |
| 404 | `PLAYLIST_NOT_FOUND` | |
| 403 | `PRIVATE_PLAYLIST` | |
| 410 | `PLAYLIST_ENDED` | |
| 403 | `PLAYLIST_NOT_STARTED` | |
| 409 | `ALREADY_PARTICIPANT` | Déjà membre, ou owner de la playlist |
| 403 | `OUTSIDE_PLAYLIST_ZONE` | |

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

| Statut | Réponse |
| --- | --- |
| 200 | *(vide)* |
| 404 | `PLAYLIST_NOT_FOUND` |
| 403 | `NOT_PLAYLIST_OWNER` |
| 404 | `PARTICIPANT_NOT_FOUND` |

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

| Statut | Réponse |
| --- | --- |
| 201 | `{ votes: number }` |
| — | erreurs communes |
| 400 | `NOT_A_VOTE_PLAYLIST` |
| 404 | `TRACK_NOT_FOUND` |
| 403 | `CANNOT_VOTE_OWN_TRACK` |
| 409 | `ALREADY_VOTED` |
| 409 | `TRACK_ALREADY_PLAYED` |

### `DELETE /playlists/:playlistId/tracks/:trackId/vote?latitude=…&longitude=…` · VOTE uniquement

Retirer son vote. La position passe en query string (pas de body sur un `DELETE`).

| Statut | Réponse |
| --- | --- |
| 200 | `{ votes: number }` |
| — | erreurs communes |
| 400 | `NOT_A_VOTE_PLAYLIST` |
| 404 | `TRACK_NOT_FOUND` |
| 404 | `VOTE_NOT_FOUND` |
| 409 | `TRACK_ALREADY_PLAYED` |

### `DELETE /playlists/:playlistId/tracks/:trackId?latitude=…&longitude=…`

Supprimer une musique (et ses votes). La licence ne s'applique pas.

- **VOTE** : owner et participants privilégiés, avec les mêmes conditions de présence que les autres actions.
- **EDITOR** : owner, participants privilégiés et auteur de la musique, à distance (position inutile).

| Statut | Réponse | Détail |
| --- | --- | --- |
| 200 | *(vide)* | |
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
