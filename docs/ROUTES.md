# Music Room API — Routes

Toutes les routes sont préfixées par `/api/v1`.
Sauf mention `(public)`, elles exigent le header `Authorization: Bearer <access_token>`.

Erreurs : `{ error: "CODE", message: string }` pour les erreurs métier,
format Nest (`{ statusCode, message, error }`) pour les erreurs de validation (400) et d'auth (401).

## Health

- GET /api/v1/health (public)
  → 200 { success: true }

## Identity

- POST /api/v1/identity/register (public)
  Body : { username: string (3-20), email: string, password: string (12-72, strong) }
  → 201 { id: string }
  → 409 ACCOUNT_ALREADY_EXISTS

- POST /api/v1/identity/login (public)
  Body : { username: string, password: string }
  → 201 { access_token: string }
  → 401 INVALID_CREDENTIALS

- GET /api/v1/identity/profile
  → 200 { success: true }

## Social

- POST /api/v1/social/friends/request/:receiverId
  → 201 { requestId: string }
  → 400 SELF_FRIENDSHIP
  → 409 FRIENDSHIP_REQUEST_ALREADY_EXISTS (demande déjà en attente, dans un sens ou dans l'autre)
  → 409 FRIENDSHIP_ALREADY_EXISTS

- POST /api/v1/social/friends/request/:requestId/accept
  Réservé au destinataire de la demande.
  → 201 { friendshipId: string }
  → 404 FRIENDSHIP_REQUEST_NOT_FOUND (inconnue, ou l'appelant n'en est pas le destinataire)

- GET /api/v1/social/friends/request/pending
  Liste les demandes reçues par l'appelant, en attente de sa réponse.
  → 200 { requests: { id: string, senderId: string, receiverId: string }[] }

- DELETE /api/v1/social/friends/request/:requestId/reject
  Refuser une demande reçue. Réservé au destinataire de la demande.
  → 200 (vide)
  → 404 FRIENDSHIP_REQUEST_NOT_FOUND (inconnue, ou l'appelant n'en est pas le destinataire)

- DELETE /api/v1/social/friends/request/:requestId/cancel
  Annuler une demande envoyée. Réservé à l'émetteur de la demande.
  → 200 (vide)
  → 404 FRIENDSHIP_REQUEST_NOT_FOUND

## Music

- GET /api/v1/music/search/:name (public)
  → 200 { musics: { name: string, videoId: string, artist: string, thumbnail: string | null, duration: number | null }[] }
  duration est en secondes, null quand YouTube ne la fournit pas (certaines vidéos).

## Playlists

- POST /api/v1/playlists
  Body : {
    type: "VOTE" | "EDITOR",
    name: string (1-100),
    description: string (max 500),
    isPrivate?: boolean (défaut false),
    license?: "EVERYONE" | "INVITED_ONLY" (défaut "EVERYONE", voir Tracks),
    beginAt?: string (ISO 8601),
    endAt?: string (ISO 8601, dans le futur et strictement après beginAt),
    latitude: number (-90..90),
    longitude: number (-180..180)
  }
  → 201 { id: string }
  → 400 INVALID_PLAYLIST_PERIOD
  → 400 PLAYLIST_END_IN_PAST
  → 409 PLAYLIST_ALREADY_EXISTS (même nom pour le même owner)

- GET /api/v1/playlists/public
  Liste les playlists publiques non terminées (celles qui n'ont pas encore commencé sont incluses).
  → 200 {
    playlists: {
      id: string,
      type: "VOTE" | "EDITOR",
      license: "EVERYONE" | "INVITED_ONLY",
      ownerId: string,
      name: string,
      description: string,
      beginAt: string | null,
      endAt: string | null,
      latitude: number,
      longitude: number,
      coverPath: string | null
    }[]
  }

- POST /api/v1/playlists/:playlistId/join
  Rejoindre une playlist publique en cours (commencée et non terminée), en étant à 500 m maximum de sa position.
  Body : { latitude: number (-90..90), longitude: number (-180..180) }
  → 201 { participantId: string }
  → 404 PLAYLIST_NOT_FOUND
  → 403 PRIVATE_PLAYLIST
  → 410 PLAYLIST_ENDED
  → 403 PLAYLIST_NOT_STARTED
  → 409 ALREADY_PARTICIPANT (déjà membre, ou owner de la playlist)
  → 403 OUTSIDE_PLAYLIST_ZONE

- POST /api/v1/playlists/:playlistId/leave
  Quitter une playlist. Toujours possible, quelle que soit la période ou la position.
  L'owner ne peut pas quitter sa propre playlist.
  → 201 (vide)
  → 404 PLAYLIST_NOT_FOUND
  → 404 PARTICIPANT_NOT_FOUND (l'appelant n'est pas participant, ou est l'owner)

### Invitations

- POST /api/v1/playlists/:playlistId/invitations
  Inviter un compte. Réservé à l'owner et aux participants privilégiés, à tout moment et de n'importe où.
  Body : { accountId: string (UUID) }
  → 201 { invitationId: string }
  → 404 PLAYLIST_NOT_FOUND
  → 410 PLAYLIST_ENDED
  → 403 INVITATION_FORBIDDEN (ni owner, ni participant privilégié)
  → 404 ACCOUNT_NOT_FOUND (compte invité inconnu)
  → 409 ALREADY_PARTICIPANT (le compte invité est déjà membre, ou est l'owner)
  → 409 INVITATION_ALREADY_EXISTS (une invitation est déjà en attente pour ce compte)

- GET /api/v1/playlists/invitations
  Liste les invitations reçues par l'appelant, en attente de sa réponse.
  → 200 {
    invitations: {
      id: string,
      playlistId: string,
      playlistName: string,
      playlistType: "VOTE" | "EDITOR",
      inviterId: string,
      inviterUsername: string | null
    }[]
  }

- POST /api/v1/playlists/invitations/:invitationId/accept
  Accepter une invitation. Réservé à l'invité. Possible avant le début de la playlist et sans être sur place :
  l'invité devient participant (sans privilège). Il ne pourra agir sur les musiques (ajout, suppression, vote)
  qu'une fois la playlist commencée et en étant à 500 m maximum.
  → 201 { participantId: string }
  → 404 INVITATION_NOT_FOUND (inconnue, ou l'appelant n'est pas l'invité)
  → 410 PLAYLIST_ENDED
  → 409 ALREADY_PARTICIPANT (déjà membre entre-temps)

- DELETE /api/v1/playlists/invitations/:invitationId/decline
  Refuser une invitation. Réservé à l'invité.
  → 200 (vide)
  → 404 INVITATION_NOT_FOUND (inconnue, ou l'appelant n'est pas l'invité)

- DELETE /api/v1/playlists/invitations/:invitationId/cancel
  Annuler une invitation envoyée. Réservé à la personne qui a invité.
  → 200 (vide)
  → 404 INVITATION_NOT_FOUND (inconnue, ou l'appelant n'est pas celui qui a invité)

### Participants

- GET /api/v1/playlists/:playlistId/participants
  Réservé aux membres (owner et participants).
  → 200 {
    owner: { accountId: string, username: string | null },
    participants: { participantId: string, accountId: string, username: string | null, hasPrivilege: boolean }[]
  }
  → 404 PLAYLIST_NOT_FOUND
  → 403 NOT_PLAYLIST_MEMBER

- PATCH /api/v1/playlists/:playlistId/participants/:participantId
  Donner ou retirer le privilège (inviter d'autres comptes). Réservé à l'owner.
  Les invitations déjà envoyées par le participant restent valides.
  Body : { hasPrivilege: boolean }
  → 200 (vide)
  → 404 PLAYLIST_NOT_FOUND
  → 403 NOT_PLAYLIST_OWNER
  → 404 PARTICIPANT_NOT_FOUND

- DELETE /api/v1/playlists/:playlistId/participants/:participantId
  Retirer un participant. Réservé à l'owner.
  → 200 (vide)
  → 404 PLAYLIST_NOT_FOUND
  → 403 NOT_PLAYLIST_OWNER
  → 404 PARTICIPANT_NOT_FOUND

### Tracks

Les routes de musiques servent aux deux types de playlists, avec des règles différentes.

Règles communes aux actions (ajout, vote, retrait de vote, déplacement) :
- Licence de la playlist : `EVERYONE` → tous les membres (owner et participants) ;
  `INVITED_ONLY` → l'owner et les participants entrés par invitation uniquement (pas ceux entrés via `join`).
- Playlist VOTE : un participant doit être sur place (playlist commencée, non terminée, à 500 m maximum).
  Il envoie sa position (`latitude` et `longitude`) ; une position absente compte comme hors zone.
- Playlist EDITOR : collaboration à distance. Aucune position n'est demandée, et on peut agir avant le début ;
  seule une playlist terminée bloque les actions.
- L'owner agit à tout moment et de n'importe où (position facultative), tant que la playlist n'est pas terminée.
- Une playlist contient au maximum 200 musiques en attente (non jouées pour VOTE, toutes pour EDITOR).

Erreurs communes à ces actions :
  → 404 PLAYLIST_NOT_FOUND
  → 403 NOT_PLAYLIST_MEMBER
  → 403 TRACK_ACTION_FORBIDDEN (exclu par la licence INVITED_ONLY)
  → 410 PLAYLIST_ENDED
  → 403 PLAYLIST_NOT_STARTED | 403 OUTSIDE_PLAYLIST_ZONE (VOTE uniquement)

- POST /api/v1/playlists/:playlistId/tracks
  Proposer une musique. Le serveur récupère lui-même titre, artiste, vignette et durée à partir du videoId.
  EDITOR : la musique est ajoutée à la fin de la playlist (on la déplace ensuite si besoin).
  Body : { videoId: string (id YouTube, 11 caractères), latitude?: number (-90..90), longitude?: number (-180..180) }
  → 201 { trackId: string }
  → erreurs communes
  → 404 MUSIC_NOT_FOUND (videoId inconnu de YouTube)
  → 409 TRACK_ALREADY_IN_PLAYLIST (déjà dans la playlist ; pour VOTE, elle peut revenir une fois jouée)
  → 409 PLAYLIST_FULL (200 musiques en attente)

- GET /api/v1/playlists/:playlistId/tracks
  Playlist publique : tout le monde ; playlist privée : membres uniquement.
  Le champ `type` indique la forme de la liste :
  VOTE → classement des musiques non jouées : plus de votes d'abord, puis la plus anciennement ajoutée.
  → 200 {
    type: "VOTE",
    tracks: {
      id: string,
      videoId: string,
      name: string,
      artist: string,
      thumbnail: string | null,
      duration: number | null,
      addedBy: string,
      addedAt: string,
      votes: number,
      hasVoted: boolean (l'appelant a voté pour cette musique)
    }[]
  }
  EDITOR → musiques dans l'ordre de la playlist, avec leur version (à renvoyer pour les déplacer).
  → 200 {
    type: "EDITOR",
    tracks: {
      id: string,
      videoId: string,
      name: string,
      artist: string,
      thumbnail: string | null,
      duration: number | null,
      addedBy: string,
      addedAt: string,
      version: number
    }[]
  }
  → 404 PLAYLIST_NOT_FOUND
  → 403 NOT_PLAYLIST_MEMBER (playlist privée)

- PATCH /api/v1/playlists/:playlistId/tracks/:trackId/position (EDITOR uniquement)
  Déplacer une musique juste après une autre (`afterTrackId`), ou en tête (`afterTrackId: null`).
  Body : { afterTrackId: string (UUID) | null (obligatoire), version: number (≥ 1, version connue de la musique) }
  → 200 { version: number } (nouvelle version de la musique)
  → erreurs communes
  → 400 NOT_AN_EDITOR_PLAYLIST
  → 400 INVALID_MOVE (musique placée après elle-même)
  → 404 TRACK_NOT_FOUND (musique ou afterTrackId inconnus dans cette playlist)
  → 409 TRACK_VERSION_CONFLICT (la musique a été déplacée entre-temps : recharger la liste)

  Gestion des accès concurrents :
  - Déplacement relatif (« après la musique Y ») et non par index : deux personnes qui déplacent deux musiques
    différentes en même temps voient leurs deux déplacements appliqués.
  - Version par musique (verrouillage optimiste) : l'écriture n'a lieu que si la version en base est encore celle
    envoyée par le client (`UPDATE … WHERE version = ?`, atomique). Si deux personnes déplacent la même musique
    en même temps, une seule réussit ; l'autre reçoit 409 et recharge la liste, rien n'est écrasé sans le savoir.
  - Positions fractionnaires : la musique déplacée reçoit le milieu de ses deux voisines, les autres ne bougent pas.
    Les modifications d'une même playlist sont sérialisées côté serveur (verrou par playlist, en mémoire).

- POST /api/v1/playlists/:playlistId/tracks/:trackId/vote (VOTE uniquement)
  Voter pour une musique (une seule fois, jamais pour une musique qu'on a proposée).
  Body : { latitude?: number, longitude?: number }
  → 201 { votes: number }
  → erreurs communes
  → 400 NOT_A_VOTE_PLAYLIST
  → 404 TRACK_NOT_FOUND
  → 403 CANNOT_VOTE_OWN_TRACK
  → 409 ALREADY_VOTED
  → 409 TRACK_ALREADY_PLAYED

- DELETE /api/v1/playlists/:playlistId/tracks/:trackId/vote?latitude=…&longitude=… (VOTE uniquement)
  Retirer son vote. La position passe en query string (pas de body sur un DELETE).
  → 200 { votes: number }
  → erreurs communes
  → 400 NOT_A_VOTE_PLAYLIST
  → 404 TRACK_NOT_FOUND
  → 404 VOTE_NOT_FOUND
  → 409 TRACK_ALREADY_PLAYED

- DELETE /api/v1/playlists/:playlistId/tracks/:trackId?latitude=…&longitude=…
  Supprimer une musique (et ses votes). La licence ne s'applique pas.
  VOTE : owner et participants privilégiés, avec les mêmes conditions de présence que les autres actions.
  EDITOR : owner, participants privilégiés et auteur de la musique, à distance (position inutile).
  → 200 (vide)
  → 404 PLAYLIST_NOT_FOUND | 403 NOT_PLAYLIST_MEMBER
  → 404 TRACK_NOT_FOUND
  → 403 TRACK_DELETE_FORBIDDEN
  → 410 PLAYLIST_ENDED | 403 PLAYLIST_NOT_STARTED | 403 OUTSIDE_PLAYLIST_ZONE (ces deux derniers : VOTE uniquement)
  → 409 TRACK_ALREADY_PLAYED (VOTE)

- POST /api/v1/playlists/:playlistId/tracks/:trackId/played (VOTE uniquement)
  Marquer une musique comme jouée : elle sort du classement. Réservé à l'owner (l'appareil qui diffuse).
  La musique est désignée par son id : deux appareils qui signalent la même musique n'en sautent pas deux.
  → 201 (vide)
  → 404 PLAYLIST_NOT_FOUND | 400 NOT_A_VOTE_PLAYLIST
  → 403 NOT_PLAYLIST_OWNER
  → 404 TRACK_NOT_FOUND
  → 409 TRACK_ALREADY_PLAYED

## Temps réel (Server-Sent Events)

Pourquoi SSE plutôt que WebSocket : les actions passent déjà par l'API REST, le client a seulement besoin d'être
prévenu des changements (flux serveur → client). SSE est natif dans NestJS (aucune dépendance supplémentaire),
passe par le même guard JWT que le reste de l'API, et se lit côté iOS avec `URLSession.bytes(for:)`.

- GET /api/v1/playlists/:playlistId/events
  Header : `Accept: text/event-stream` (et `Authorization: Bearer <access_token>` comme partout).
  Mêmes droits que GET /tracks : playlist publique → tout le monde, privée → membres.
  Les erreurs d'accès sont renvoyées en JSON classique, avant l'ouverture du flux :
  → 404 PLAYLIST_NOT_FOUND
  → 403 NOT_PLAYLIST_MEMBER
  Sinon → 200, flux `text/event-stream` qui reste ouvert.

  Chaque message est une ligne `data: <JSON>` ; le JSON porte toujours un champ `type` :
  - { type: "track.added", playlistId, track, afterTrackId }
    `track` a la même forme que dans GET /tracks (sans `hasVoted`) : avec `votes` pour VOTE, `version` pour EDITOR.
    `afterTrackId` : EDITOR → musique après laquelle elle a été placée (null si première) ; VOTE → toujours null.
  - { type: "track.votes_changed", playlistId, trackId, votes } (VOTE)
  - { type: "track.moved", playlistId, trackId, afterTrackId, version } (EDITOR ; afterTrackId null = en tête)
  - { type: "track.played", playlistId, trackId } (VOTE)
  - { type: "track.removed", playlistId, trackId }
  - { type: "heartbeat" } toutes les 25 s (garde la connexion ouverte ; à ignorer côté client)

  Côté client :
  - Le flux ne rejoue pas le passé : charger d'abord l'état avec GET /tracks, puis appliquer les événements.
  - iOS coupe la connexion quand l'app passe en arrière-plan : au retour au premier plan, recharger GET /tracks
    puis rouvrir le flux. Même chose après une coupure réseau (pas de heartbeat depuis plus de 25 s).
  - EDITOR : appliquer `track.moved` en plaçant la musique après `afterTrackId`, et garder sa nouvelle `version`
    pour un prochain déplacement. Aucune position numérique n'est exposée : seul l'ordre compte.
  - Limite actuelle : les événements (et le verrou des playlists EDITOR) vivent en mémoire dans le process de
    l'API ; ils ne sont partagés qu'entre les clients connectés à la même instance.
