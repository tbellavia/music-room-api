#!/usr/bin/env bash
# Manual end-to-end check of the tracks of VOTE playlists and of the SSE stream.
# Requires a running API (make start), curl, jq, and network access to YouTube.
#
# Usage: ./scripts/test-vote-tracks.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# 42 Paris
PLAYLIST_LATITUDE=48.8966
PLAYLIST_LONGITUDE=2.3184
LATITUDE_600M_NORTH=48.9020
ON_SITE="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE"
ON_SITE_QUERY="?latitude=$PLAYLIST_LATITUDE&longitude=$PLAYLIST_LONGITUDE"

ONE_MORE_TIME="FGBhQbmPwH8"
NEVER_GONNA="dQw4w9WgXcQ"
UNKNOWN_VIDEO="xxxxxxxxxxx"
UNKNOWN_ID="00000000-0000-0000-0000-000000000000"

EVENTS_FILE=$(mktemp)
SSE_PID=""
trap 'rm -f "$RESPONSE_FILE" "$EVENTS_FILE"; [ -n "$SSE_PID" ] && kill "$SSE_PID" 2>/dev/null' EXIT

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

# json_field FIELD -> reads a field of the last response
json_field() {
  echo "$BODY" | jq -r ".$1 // empty"
}

# add_track TOKEN PLAYLIST_ID VIDEO_ID [POSITION_JSON]
add_track() {
  if [ -n "${4:-}" ]; then
    request POST "/playlists/$2/tracks" "$1" "{\"videoId\":\"$3\",$4}"
  else
    request POST "/playlists/$2/tracks" "$1" "{\"videoId\":\"$3\"}"
  fi
}

# vote TOKEN PLAYLIST_ID TRACK_ID [POSITION_JSON]
vote() {
  request POST "/playlists/$2/tracks/$3/vote" "$1" "{${4:-}}"
}

# list_tracks TOKEN PLAYLIST_ID
list_tracks() {
  request GET "/playlists/$2/tracks" "$1"
}

# events_status TOKEN PLAYLIST_ID -> HTTP status of the SSE route (does not wait for the stream)
events_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 2 \
    -H "Authorization: Bearer $1" -H 'Accept: text/event-stream' \
    "$API/playlists/$2/events"
}

preflight

section "Setup"
ALICE_ID=$(register "alice$SUFFIX") || exit 1
register "bob$SUFFIX" >/dev/null || exit 1
CAROL_ID=$(register "carol$SUFFIX") || exit 1
register "dave$SUFFIX" >/dev/null || exit 1
ALICE=$(login "alice$SUFFIX") || exit 1
BOB=$(login "bob$SUFFIX") || exit 1
CAROL=$(login "carol$SUFFIX") || exit 1
DAVE=$(login "dave$SUFFIX") || exit 1
echo "  owner: alice$SUFFIX, joins: bob$SUFFIX, invited: carol$SUFFIX, stranger: dave$SUFFIX"

LOCATION="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE"
PUBLIC=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Public $SUFFIX\",\"description\":\"\",$LOCATION}") || exit 1
INVITED_ONLY=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Invited $SUFFIX\",\"description\":\"\",\"license\":\"INVITED_ONLY\",$LOCATION}") || exit 1
PRIVATE=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Private $SUFFIX\",\"description\":\"\",\"isPrivate\":true,$LOCATION}") || exit 1
EDITOR=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Editor $SUFFIX\",\"description\":\"\",$LOCATION}") || exit 1

request POST "/playlists/$PUBLIC/join" "$BOB" "{$ON_SITE}"
BOB_PARTICIPANT=$(json_field participantId)
request POST "/playlists/$INVITED_ONLY/join" "$BOB" "{$ON_SITE}"
for playlist in "$PUBLIC" "$INVITED_ONLY"; do
  request POST "/playlists/$playlist/invitations" "$ALICE" "{\"accountId\":\"$CAROL_ID\"}"
  request POST "/playlists/invitations/$(json_field invitationId)/accept" "$CAROL"
done
echo "  playlists: public (EVERYONE), invited only, private, editor"

# dave is not a member: a public playlist can be watched by anyone
curl -sN -H "Authorization: Bearer $DAVE" -H 'Accept: text/event-stream' \
  "$API/playlists/$PUBLIC/events" >"$EVENTS_FILE" &
SSE_PID=$!
sleep 1
echo "  SSE stream opened on the public playlist"

section "POST /playlists/:playlistId/tracks"
request POST "/playlists/$PUBLIC/tracks" "" "{\"videoId\":\"$ONE_MORE_TIME\"}"
expect "without token → 401" 401

add_track "$DAVE" "$PUBLIC" "$ONE_MORE_TIME" "$ON_SITE"
expect "non member → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

add_track "$ALICE" "$PUBLIC" "not-an-id"
expect "invalid videoId → 400" 400

add_track "$BOB" "$PUBLIC" "$ONE_MORE_TIME"
expect "participant without position → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

add_track "$BOB" "$PUBLIC" "$ONE_MORE_TIME" "\"latitude\":$LATITUDE_600M_NORTH,\"longitude\":$PLAYLIST_LONGITUDE"
expect "participant 600 m away → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

add_track "$BOB" "$PUBLIC" "$ONE_MORE_TIME" "$ON_SITE"
expect "participant on site → 201" 201
TRACK_BOB=$(json_field trackId)

add_track "$ALICE" "$PUBLIC" "$ONE_MORE_TIME"
expect "same music again → 409 TRACK_ALREADY_IN_PLAYLIST" 409 TRACK_ALREADY_IN_PLAYLIST

add_track "$ALICE" "$PUBLIC" "$UNKNOWN_VIDEO"
expect "unknown YouTube video → 404 MUSIC_NOT_FOUND" 404 MUSIC_NOT_FOUND

add_track "$ALICE" "$PUBLIC" "$NEVER_GONNA"
expect "owner without position → 201" 201
TRACK_ALICE=$(json_field trackId)

add_track "$ALICE" "$EDITOR" "$NEVER_GONNA"
expect "editor playlist → 400 NOT_A_VOTE_PLAYLIST" 400 NOT_A_VOTE_PLAYLIST

section "GET /playlists/:playlistId/tracks"
list_tracks "$DAVE" "$PUBLIC"
expect "anyone reads a public playlist → 200" 200
expect_json "music informations come from YouTube" \
  "any(.tracks[]; .id == \"$TRACK_BOB\" and .name == \"One More Time\" and .artist == \"Daft Punk\")"

list_tracks "$DAVE" "$PRIVATE"
expect "non member reads a private playlist → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

section "POST /playlists/:playlistId/tracks/:trackId/vote"
vote "$BOB" "$PUBLIC" "$TRACK_BOB" "$ON_SITE"
expect "vote for own track → 403 CANNOT_VOTE_OWN_TRACK" 403 CANNOT_VOTE_OWN_TRACK

vote "$BOB" "$PUBLIC" "$TRACK_ALICE"
expect "participant without position → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

vote "$BOB" "$PUBLIC" "$TRACK_ALICE" "$ON_SITE"
expect "bob votes → 201" 201
expect_json "1 vote" ".votes == 1"

vote "$BOB" "$PUBLIC" "$TRACK_ALICE" "$ON_SITE"
expect "vote twice → 409 ALREADY_VOTED" 409 ALREADY_VOTED

vote "$CAROL" "$PUBLIC" "$TRACK_ALICE" "$ON_SITE"
expect_json "carol votes → 2 votes" ".votes == 2"

vote "$ALICE" "$PUBLIC" "$TRACK_BOB"
expect "owner votes without position → 201" 201

vote "$DAVE" "$PUBLIC" "$TRACK_ALICE" "$ON_SITE"
expect "non member → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

vote "$ALICE" "$PUBLIC" "$UNKNOWN_ID"
expect "unknown track → 404 TRACK_NOT_FOUND" 404 TRACK_NOT_FOUND

list_tracks "$BOB" "$PUBLIC"
expect_json "ranking: alice's track first with 2 votes, bob voted for it" \
  ".tracks[0].id == \"$TRACK_ALICE\" and .tracks[0].votes == 2 and .tracks[0].hasVoted == true"
expect_json "ranking: bob's track second with 1 vote" \
  ".tracks[1].id == \"$TRACK_BOB\" and .tracks[1].votes == 1 and .tracks[1].hasVoted == false"

section "DELETE /playlists/:playlistId/tracks/:trackId/vote"
request DELETE "/playlists/$PUBLIC/tracks/$TRACK_BOB/vote$ON_SITE_QUERY" "$CAROL"
expect "withdraw a vote never given → 404 VOTE_NOT_FOUND" 404 VOTE_NOT_FOUND

request DELETE "/playlists/$PUBLIC/tracks/$TRACK_ALICE/vote" "$CAROL"
expect "participant without position → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

request DELETE "/playlists/$PUBLIC/tracks/$TRACK_ALICE/vote$ON_SITE_QUERY" "$CAROL"
expect "carol withdraws her vote → 200" 200
expect_json "back to 1 vote" ".votes == 1"

section "INVITED_ONLY license"
add_track "$BOB" "$INVITED_ONLY" "$ONE_MORE_TIME" "$ON_SITE"
expect "participant who joined → 403 TRACK_ACTION_FORBIDDEN" 403 TRACK_ACTION_FORBIDDEN

add_track "$CAROL" "$INVITED_ONLY" "$ONE_MORE_TIME" "$ON_SITE"
expect "invited participant → 201" 201

section "DELETE /playlists/:playlistId/tracks/:trackId"
request DELETE "/playlists/$PUBLIC/tracks/$TRACK_ALICE$ON_SITE_QUERY" "$BOB"
expect "regular participant → 403 TRACK_DELETE_FORBIDDEN" 403 TRACK_DELETE_FORBIDDEN

request PATCH "/playlists/$PUBLIC/participants/$BOB_PARTICIPANT" "$ALICE" '{"hasPrivilege":true}'
request DELETE "/playlists/$PUBLIC/tracks/$TRACK_BOB" "$BOB"
expect "privileged participant without position → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

request DELETE "/playlists/$PUBLIC/tracks/$TRACK_BOB$ON_SITE_QUERY" "$BOB"
expect "privileged participant on site → 200" 200

list_tracks "$BOB" "$PUBLIC"
expect_json "deleted track is gone" "all(.tracks[]; .id != \"$TRACK_BOB\")"

section "POST /playlists/:playlistId/tracks/:trackId/played"
request POST "/playlists/$PUBLIC/tracks/$TRACK_ALICE/played" "$BOB"
expect "participant → 403 NOT_PLAYLIST_OWNER" 403 NOT_PLAYLIST_OWNER

request POST "/playlists/$PUBLIC/tracks/$TRACK_ALICE/played" "$ALICE"
expect "owner → 201" 201

request POST "/playlists/$PUBLIC/tracks/$TRACK_ALICE/played" "$ALICE"
expect "twice → 409 TRACK_ALREADY_PLAYED" 409 TRACK_ALREADY_PLAYED

vote "$CAROL" "$PUBLIC" "$TRACK_ALICE" "$ON_SITE"
expect "vote for a played track → 409 TRACK_ALREADY_PLAYED" 409 TRACK_ALREADY_PLAYED

list_tracks "$BOB" "$PUBLIC"
expect_json "played track left the ranking" "all(.tracks[]; .id != \"$TRACK_ALICE\")"

add_track "$ALICE" "$PUBLIC" "$NEVER_GONNA"
expect "same music once played → 201" 201

section "GET /playlists/:playlistId/events (SSE)"
STATUS=$(events_status "$DAVE" "$PRIVATE")
BODY=""
expect "non member watches a private playlist → 403" 403

STATUS=$(events_status "$DAVE" "$UNKNOWN_ID")
expect "unknown playlist → 404" 404

sleep 1
kill "$SSE_PID" 2>/dev/null
wait "$SSE_PID" 2>/dev/null
SSE_PID=""
BODY=$(grep '^data:' "$EVENTS_FILE" | sed 's/^data: *//' | jq -s '.')

expect_json "track.added received for the three added tracks" \
  "[.[] | select(.type == \"track.added\")] | length == 3"
expect_json "track.added carries the music informations" \
  "any(.[]; .type == \"track.added\" and .track.id == \"$TRACK_BOB\" and .track.name == \"One More Time\")"
expect_json "track.votes_changed received with the new counts" \
  "[.[] | select(.type == \"track.votes_changed\" and .trackId == \"$TRACK_ALICE\") | .votes] == [1, 2, 1]"
expect_json "track.removed received" \
  "any(.[]; .type == \"track.removed\" and .trackId == \"$TRACK_BOB\")"
expect_json "track.played received" \
  "any(.[]; .type == \"track.played\" and .trackId == \"$TRACK_ALICE\")"
expect_json "no event from another playlist" \
  "all(.[]; .playlistId == \"$PUBLIC\")"

summary
