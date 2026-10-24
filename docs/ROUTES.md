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
  Rejoindre une playlist publique en cours (commencée et non terminée), en étant à 2 km maximum de sa position.
  Body : { latitude: number (-90..90), longitude: number (-180..180) }
  → 201 { participantId: string }
  → 404 PLAYLIST_NOT_FOUND
  → 403 PRIVATE_PLAYLIST
  → 410 PLAYLIST_ENDED
  → 403 PLAYLIST_NOT_STARTED
  → 409 ALREADY_PARTICIPANT (déjà membre, ou owner de la playlist)
  → 403 OUTSIDE_PLAYLIST_ZONE
