#!/usr/bin/env bash
# Manual end-to-end check of the detail of a playlist, and of the validation of
# the ids in the URL.
# Requires curl and jq.
# Run through `make test-e2e`: the API must be in E2E mode to verify the accounts.
#
# Usage: make test-e2e, or ./scripts/test-get-playlist.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

PARTY_LATITUDE=-41.5
PARTY_LONGITUDE=-141
# ~1.1 km north of the party
FAR_LATITUDE=-41.49
UNKNOWN_ID=3f2b8c1e-9d4a-4e7b-8a6f-1c2d3e4f5a6b

# create_playlist TOKEN JSON_BODY -> prints the playlist id
create_playlist() {
  local playlist_id

  request POST /playlists "$1" "$2"
  playlist_id=$(echo "$BODY" | jq -r '.id // empty')
  if [ -z "$playlist_id" ]; then
    echo "Cannot create playlist (HTTP $STATUS): $BODY" >&2
    exit 1
  fi
  echo "$playlist_id"
}

preflight

section "Setup"
OWNER_ID=$(register "owner$SUFFIX") || exit 1
OWNER=$(login "owner$SUFFIX") || exit 1
MEMBER_ID=$(register "member$SUFFIX") || exit 1
MEMBER=$(login "member$SUFFIX") || exit 1
INVITEE_ID=$(register "invitee$SUFFIX") || exit 1
INVITEE=$(login "invitee$SUFFIX") || exit 1
STRANGER_ID=$(register "stranger$SUFFIX") || exit 1
STRANGER=$(login "stranger$SUFFIX") || exit 1

PARTY=$(create_playlist "$OWNER" \
  "{\"type\":\"VOTE\",\"name\":\"Party $SUFFIX\",\"description\":\"Au bout du monde\",\"latitude\":$PARTY_LATITUDE,\"longitude\":$PARTY_LONGITUDE,\"address\":\"Pacifique Sud\"}") || exit 1
PROJECT=$(create_playlist "$OWNER" \
  "{\"type\":\"EDITOR\",\"name\":\"Project $SUFFIX\",\"description\":\"\",\"isPrivate\":true,\"license\":\"INVITED_ONLY\"}") || exit 1

request POST "/playlists/$PARTY/join" "$MEMBER" \
  "{\"latitude\":$PARTY_LATITUDE,\"longitude\":$PARTY_LONGITUDE}"
if [ "$STATUS" != "201" ]; then
  echo "The member cannot join (HTTP $STATUS): $BODY" >&2
  exit 1
fi
request POST "/playlists/$PROJECT/invitations" "$OWNER" "{\"accountId\":\"$INVITEE_ID\"}"
if [ "$STATUS" != "201" ]; then
  echo "Cannot invite (HTTP $STATUS): $BODY" >&2
  exit 1
fi
echo "  owner$SUFFIX owns a public VOTE party and a private project"
echo "  member$SUFFIX joined the party, invitee$SUFFIX is invited to the project"

section "GET /playlists/:playlistId"
request GET "/playlists/$PARTY" "$STRANGER"
expect "a public playlist, seen by a stranger → 200" 200
expect_json "same object as the lists, without envelope" \
  ".id == \"$PARTY\" and .type == \"VOTE\" and .name == \"Party $SUFFIX\" and .ownerUsername == \"owner$SUFFIX\" and .address == \"Pacifique Sud\" and .status == \"LIVE\" and (has(\"playlists\") | not)"
expect_json "no role, no privilege, no distance without position" \
  ".role == null and .hasPrivilege == false and .distanceMeters == null and .canJoinHere == false"

request GET "/playlists/$PARTY" "$OWNER"
expect_json "the owner → role OWNER, privilege" \
  ".role == \"OWNER\" and .hasPrivilege == true"

request GET "/playlists/$PARTY" "$MEMBER"
expect_json "a participant → role PARTICIPANT" \
  ".role == \"PARTICIPANT\" and .hasPrivilege == false"

request GET "/playlists/$PARTY?latitude=$PARTY_LATITUDE&longitude=$PARTY_LONGITUDE" "$STRANGER"
expect_json "a stranger on site → distance 0, canJoinHere" \
  ".distanceMeters == 0 and .canJoinHere == true"

request GET "/playlists/$PARTY?latitude=$FAR_LATITUDE&longitude=$PARTY_LONGITUDE" "$STRANGER"
expect_json "a stranger 1 km away → cannot join here" \
  ".distanceMeters > 1000 and .canJoinHere == false"

request GET "/playlists/$PARTY?latitude=$PARTY_LATITUDE&longitude=$PARTY_LONGITUDE" "$MEMBER"
expect_json "a member on site → cannot join again" \
  ".canJoinHere == false"

request GET "/playlists/$PROJECT" "$OWNER"
expect "a private playlist, seen by its owner → 200" 200

request GET "/playlists/$PROJECT" "$INVITEE"
expect "a private playlist, seen by an invitee who has not accepted → 200" 200
expect_json "the invitee has no role yet" ".role == null and .isPrivate == true"

request GET "/playlists/$PROJECT" "$STRANGER"
expect "a private playlist, seen by a stranger → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

request GET "/playlists/$UNKNOWN_ID" "$OWNER"
expect "an unknown playlist → 404 PLAYLIST_NOT_FOUND" 404 PLAYLIST_NOT_FOUND

request GET "/playlists/not-a-uuid" "$OWNER"
expect "an id that is not a UUID → 400 PLAYLIST_ID_INVALID" 400 PLAYLIST_ID_INVALID

request GET "/playlists/$PARTY?latitude=$PARTY_LATITUDE" "$STRANGER"
expect "a latitude alone → 400 LONGITUDE_INVALID" 400 LONGITUDE_INVALID

request GET "/playlists/$PARTY?latitude=91&longitude=0" "$STRANGER"
expect "a latitude out of range → 400 LATITUDE_OUT_OF_RANGE" 400 LATITUDE_OUT_OF_RANGE

request GET "/playlists/$PARTY"
expect "without token → 401 UNAUTHORIZED" 401 UNAUTHORIZED

section "The fixed routes still win over :playlistId"
request GET /playlists/public "$STRANGER"
expect_json "GET /playlists/public → the list" "has(\"playlists\")"
request GET /playlists/invitations "$INVITEE"
expect_json "GET /playlists/invitations → the invitations" "has(\"invitations\")"

section "Ids in the URL must be UUIDs"
request GET "/playlists/not-a-uuid/tracks" "$OWNER"
expect "GET /playlists/not-a-uuid/tracks → 400 PLAYLIST_ID_INVALID" 400 PLAYLIST_ID_INVALID
request POST "/playlists/$PARTY/tracks/not-a-uuid/vote" "$OWNER" \
  "{\"latitude\":$PARTY_LATITUDE,\"longitude\":$PARTY_LONGITUDE}"
expect "a trackId that is not a UUID → 400 TRACK_ID_INVALID" 400 TRACK_ID_INVALID
request DELETE "/playlists/$PARTY/participants/42" "$OWNER"
expect "a participantId that is not a UUID → 400 PARTICIPANT_ID_INVALID" 400 PARTICIPANT_ID_INVALID
request POST /playlists/invitations/abc/accept "$INVITEE"
expect "an invitationId that is not a UUID → 400 INVITATION_ID_INVALID" 400 INVITATION_ID_INVALID
request POST /social/friends/request/abc "$OWNER"
expect "a receiverId that is not a UUID → 400 RECEIVER_ID_INVALID" 400 RECEIVER_ID_INVALID
request POST /social/friends/request/abc/accept "$OWNER"
expect "a requestId that is not a UUID → 400 REQUEST_ID_INVALID" 400 REQUEST_ID_INVALID
request GET "/playlists/$UNKNOWN_ID/tracks" "$OWNER"
expect "a well-formed but unknown id → still 404 PLAYLIST_NOT_FOUND" 404 PLAYLIST_NOT_FOUND

summary
