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

### Tracks (playlists VOTE)

Règles communes aux actions sur les musiques (ajout, vote, retrait de vote, suppression) :
- Licence de la playlist : `EVERYONE` → tous les membres (owner et participants) ;
  `INVITED_ONLY` → l'owner et les participants entrés par invitation uniquement (pas ceux entrés via `join`).
- Un participant doit être sur place : playlist commencée, non terminée, et à 500 m maximum.
  Il envoie sa position (`latitude` et `longitude`) ; une position absente compte comme hors zone.
- L'owner agit à tout moment et de n'importe où (position facultative), tant que la playlist n'est pas terminée.

Erreurs communes à ces actions :
  → 404 PLAYLIST_NOT_FOUND
  → 400 NOT_A_VOTE_PLAYLIST (playlist EDITOR)
  → 403 NOT_PLAYLIST_MEMBER
  → 403 TRACK_ACTION_FORBIDDEN (exclu par la licence INVITED_ONLY)
  → 403 PLAYLIST_NOT_STARTED | 410 PLAYLIST_ENDED | 403 OUTSIDE_PLAYLIST_ZONE

- POST /api/v1/playlists/:playlistId/tracks
  Proposer une musique. Le serveur récupère lui-même titre, artiste, vignette et durée à partir du videoId.
  Body : { videoId: string (id YouTube, 11 caractères), latitude?: number (-90..90), longitude?: number (-180..180) }
  → 201 { trackId: string }
  → erreurs communes
  → 404 MUSIC_NOT_FOUND (videoId inconnu de YouTube)
  → 409 TRACK_ALREADY_IN_PLAYLIST (déjà en attente dans la playlist ; elle peut revenir une fois jouée)

- GET /api/v1/playlists/:playlistId/tracks
  Classement des musiques non jouées : plus de votes d'abord, puis la plus anciennement ajoutée.
  Playlist publique : tout le monde ; playlist privée : membres uniquement.
  → 200 {
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
  → 404 PLAYLIST_NOT_FOUND
  → 400 NOT_A_VOTE_PLAYLIST
  → 403 NOT_PLAYLIST_MEMBER (playlist privée)

- POST /api/v1/playlists/:playlistId/tracks/:trackId/vote
  Voter pour une musique (une seule fois, jamais pour une musique qu'on a proposée).
  Body : { latitude?: number, longitude?: number }
  → 201 { votes: number }
  → erreurs communes
  → 404 TRACK_NOT_FOUND
  → 403 CANNOT_VOTE_OWN_TRACK
  → 409 ALREADY_VOTED
  → 409 TRACK_ALREADY_PLAYED

- DELETE /api/v1/playlists/:playlistId/tracks/:trackId/vote?latitude=…&longitude=…
  Retirer son vote. La position passe en query string (pas de body sur un DELETE).
  → 200 { votes: number }
  → erreurs communes
  → 404 TRACK_NOT_FOUND
  → 404 VOTE_NOT_FOUND
  → 409 TRACK_ALREADY_PLAYED

- DELETE /api/v1/playlists/:playlistId/tracks/:trackId?latitude=…&longitude=…
  Supprimer une musique (et ses votes). Réservé à l'owner et aux participants privilégiés,
  avec les mêmes conditions de présence que les autres actions (la licence ne s'applique pas).
  → 200 (vide)
  → 404 PLAYLIST_NOT_FOUND | 400 NOT_A_VOTE_PLAYLIST | 403 NOT_PLAYLIST_MEMBER
  → 403 TRACK_DELETE_FORBIDDEN (ni owner, ni participant privilégié)
  → 403 PLAYLIST_NOT_STARTED | 410 PLAYLIST_ENDED | 403 OUTSIDE_PLAYLIST_ZONE
  → 404 TRACK_NOT_FOUND
  → 409 TRACK_ALREADY_PLAYED

- POST /api/v1/playlists/:playlistId/tracks/:trackId/played
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
  - { type: "track.added", playlistId, track: { id, videoId, name, artist, thumbnail, duration, addedBy, addedAt, votes } }
  - { type: "track.votes_changed", playlistId, trackId, votes }
  - { type: "track.played", playlistId, trackId }
  - { type: "track.removed", playlistId, trackId }
  - { type: "heartbeat" } toutes les 25 s (garde la connexion ouverte ; à ignorer côté client)

  Côté client :
  - Le flux ne rejoue pas le passé : charger d'abord l'état avec GET /tracks, puis appliquer les événements.
  - iOS coupe la connexion quand l'app passe en arrière-plan : au retour au premier plan, recharger GET /tracks
    puis rouvrir le flux. Même chose après une coupure réseau (pas de heartbeat depuis plus de 25 s).
  - Limite actuelle : les événements circulent en mémoire dans le process de l'API ; ils ne sont partagés
    qu'entre les clients connectés à la même instance.
