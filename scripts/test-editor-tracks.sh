#!/usr/bin/env bash
# Manual end-to-end check of the tracks of EDITOR playlists: add, move
# (including two simultaneous moves of the same track), delete, license, SSE.
# Requires a running API (make start), curl, jq, and network access to YouTube.
#
# Usage: ./scripts/test-editor-tracks.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# 42 Paris
PLAYLIST_LATITUDE=48.8966
PLAYLIST_LONGITUDE=2.3184
ON_SITE="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE"

ONE_MORE_TIME="FGBhQbmPwH8"
NEVER_GONNA="dQw4w9WgXcQ"
GANGNAM_STYLE="9bZkp7q19f0"
UNKNOWN_ID="00000000-0000-0000-0000-000000000000"

EVENTS_FILE=$(mktemp)
FIRST_MOVE_FILE=$(mktemp)
SECOND_MOVE_FILE=$(mktemp)
SSE_PID=""
trap 'rm -f "$RESPONSE_FILE" "$EVENTS_FILE" "$FIRST_MOVE_FILE" "$SECOND_MOVE_FILE"; [ -n "$SSE_PID" ] && kill "$SSE_PID" 2>/dev/null' EXIT

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

# add_track TOKEN PLAYLIST_ID VIDEO_ID
add_track() {
  request POST "/playlists/$2/tracks" "$1" "{\"videoId\":\"$3\"}"
}

# move TOKEN PLAYLIST_ID TRACK_ID AFTER_TRACK_ID|null VERSION
move() {
  local after_track="null"
  if [ "$4" != "null" ]; then
    after_track="\"$4\""
  fi
  request PATCH "/playlists/$2/tracks/$3/position" "$1" \
    "{\"afterTrackId\":$after_track,\"version\":$5}"
}

# order TOKEN PLAYLIST_ID -> sets BODY to the list of track ids, in order
read_order() {
  request GET "/playlists/$2/tracks" "$1"
  BODY=$(echo "$BODY" | jq -c '[.tracks[].id]')
}

# expect_order DESCRIPTION EXPECTED_IDS... -> compares with the current order
expect_order() {
  local description=$1
  shift
  local expected
  expected=$(printf '%s\n' "$@" | jq -R . | jq -sc .)
  read_order "$ALICE" "$RADIO"
  if [ "$BODY" = "$expected" ]; then
    pass "$description"
  else
    fail "$description" "expected $expected, got $BODY"
  fi
}

preflight

section "Setup"
register "alice$SUFFIX" >/dev/null || exit 1
register "bob$SUFFIX" >/dev/null || exit 1
CAROL_ID=$(register "carol$SUFFIX") || exit 1
register "dave$SUFFIX" >/dev/null || exit 1
ALICE=$(login "alice$SUFFIX") || exit 1
BOB=$(login "bob$SUFFIX") || exit 1
CAROL=$(login "carol$SUFFIX") || exit 1
DAVE=$(login "dave$SUFFIX") || exit 1
echo "  owner: alice$SUFFIX, joins: bob$SUFFIX, invited: carol$SUFFIX, stranger: dave$SUFFIX"

LOCATION="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE"
RADIO=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Radio $SUFFIX\",\"description\":\"\",$LOCATION}") || exit 1
INVITED_ONLY=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Invited $SUFFIX\",\"description\":\"\",\"license\":\"INVITED_ONLY\",$LOCATION}") || exit 1
VOTE=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Vote $SUFFIX\",\"description\":\"\",$LOCATION}") || exit 1

request POST "/playlists/$RADIO/join" "$BOB" "{$ON_SITE}"
request POST "/playlists/$INVITED_ONLY/join" "$BOB" "{$ON_SITE}"
request POST "/playlists/$INVITED_ONLY/invitations" "$ALICE" "{\"accountId\":\"$CAROL_ID\"}"
request POST "/playlists/invitations/$(json_field invitationId)/accept" "$CAROL"
echo "  playlists: radio (EDITOR, EVERYONE), invited only (EDITOR), vote"

# dave is not a member: a public playlist can be watched by anyone
curl -sN -H "Authorization: Bearer $DAVE" -H 'Accept: text/event-stream' \
  "$API/playlists/$RADIO/events" >"$EVENTS_FILE" &
SSE_PID=$!
sleep 1
echo "  SSE stream opened on the radio playlist"

section "POST /playlists/:playlistId/tracks (EDITOR)"
add_track "$BOB" "$RADIO" "$ONE_MORE_TIME"
expect "participant adds remotely, without position → 201" 201
TRACK_1=$(json_field trackId)

add_track "$ALICE" "$RADIO" "$NEVER_GONNA"
expect "owner adds → 201" 201
TRACK_2=$(json_field trackId)

add_track "$ALICE" "$RADIO" "$GANGNAM_STYLE"
TRACK_3=$(json_field trackId)

add_track "$DAVE" "$RADIO" "$ONE_MORE_TIME"
expect "non member → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

add_track "$ALICE" "$RADIO" "$ONE_MORE_TIME"
expect "same music twice → 409 TRACK_ALREADY_IN_PLAYLIST" 409 TRACK_ALREADY_IN_PLAYLIST

section "GET /playlists/:playlistId/tracks (EDITOR)"
request GET "/playlists/$RADIO/tracks" "$DAVE"
expect "anyone reads a public playlist → 200" 200
expect_json "type is EDITOR" '.type == "EDITOR"'
expect_json "tracks in the order they were added, all in version 1" \
  "[.tracks[] | [.id, .version]] == [[\"$TRACK_1\", 1], [\"$TRACK_2\", 1], [\"$TRACK_3\", 1]]"
expect_json "no votes in an EDITOR playlist" "all(.tracks[]; has(\"votes\") | not)"

section "PATCH /playlists/:playlistId/tracks/:trackId/position"
request PATCH "/playlists/$RADIO/tracks/$TRACK_3/position" "" '{"afterTrackId":null,"version":1}'
expect "without token → 401" 401

move "$DAVE" "$RADIO" "$TRACK_3" null 1
expect "non member → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

move "$BOB" "$RADIO" "$TRACK_3" null 1
expect "participant moves track 3 to the top → 200" 200
expect_json "new version 2" ".version == 2"
expect_order "order is 3, 1, 2" "$TRACK_3" "$TRACK_1" "$TRACK_2"

move "$ALICE" "$RADIO" "$TRACK_3" "$TRACK_2" 1
expect "move based on an outdated version → 409 TRACK_VERSION_CONFLICT" 409 TRACK_VERSION_CONFLICT
expect_order "order unchanged after the conflict" "$TRACK_3" "$TRACK_1" "$TRACK_2"

move "$ALICE" "$RADIO" "$TRACK_1" "$TRACK_1" 1
expect "track after itself → 400 INVALID_MOVE" 400 INVALID_MOVE

move "$ALICE" "$RADIO" "$TRACK_1" "$UNKNOWN_ID" 1
expect "unknown anchor track → 404 TRACK_NOT_FOUND" 404 TRACK_NOT_FOUND

request PATCH "/playlists/$RADIO/tracks/$TRACK_1/position" "$ALICE" '{"version":1}'
expect "missing afterTrackId → 400" 400

request PATCH "/playlists/$RADIO/tracks/$TRACK_1/position" "$ALICE" '{"afterTrackId":null,"version":0}'
expect "invalid version → 400" 400

move "$ALICE" "$VOTE" "$TRACK_1" null 1
expect "VOTE playlist → 400 NOT_AN_EDITOR_PLAYLIST" 400 NOT_AN_EDITOR_PLAYLIST

request POST "/playlists/$RADIO/tracks/$TRACK_1/vote" "$ALICE" '{}'
expect "vote in an EDITOR playlist → 400 NOT_A_VOTE_PLAYLIST" 400 NOT_A_VOTE_PLAYLIST

section "Two simultaneous moves of the same track"
# Alice and Bob both see track 2 in version 1 and move it at the same time
curl -s -o /dev/null -w '%{http_code}' -X PATCH \
  -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' \
  -d "{\"afterTrackId\":null,\"version\":1}" \
  "$API/playlists/$RADIO/tracks/$TRACK_2/position" >"$FIRST_MOVE_FILE" &
FIRST_MOVE_PID=$!
curl -s -o /dev/null -w '%{http_code}' -X PATCH \
  -H "Authorization: Bearer $BOB" -H 'Content-Type: application/json' \
  -d "{\"afterTrackId\":\"$TRACK_3\",\"version\":1}" \
  "$API/playlists/$RADIO/tracks/$TRACK_2/position" >"$SECOND_MOVE_FILE" &
SECOND_MOVE_PID=$!
wait "$FIRST_MOVE_PID" "$SECOND_MOVE_PID"

STATUSES=$(printf '%s\n%s\n' "$(cat "$FIRST_MOVE_FILE")" "$(cat "$SECOND_MOVE_FILE")" | sort | tr '\n' ' ')
if [ "$STATUSES" = "200 409 " ]; then
  pass "one move passes (200), the other gets a conflict (409)"
else
  fail "one move passes (200), the other gets a conflict (409)" "got: $STATUSES"
fi

request GET "/playlists/$RADIO/tracks" "$ALICE"
expect_json "track 2 moved exactly once (version 2)" \
  "any(.tracks[]; .id == \"$TRACK_2\" and .version == 2)"

section "INVITED_ONLY license"
add_track "$BOB" "$INVITED_ONLY" "$ONE_MORE_TIME"
expect "participant who joined → 403 TRACK_ACTION_FORBIDDEN" 403 TRACK_ACTION_FORBIDDEN

add_track "$CAROL" "$INVITED_ONLY" "$ONE_MORE_TIME"
expect "invited participant, remotely → 201" 201

section "DELETE /playlists/:playlistId/tracks/:trackId (EDITOR)"
request DELETE "/playlists/$RADIO/tracks/$TRACK_3" "$BOB"
expect "regular participant deletes someone else's track → 403 TRACK_DELETE_FORBIDDEN" 403 TRACK_DELETE_FORBIDDEN

request DELETE "/playlists/$RADIO/tracks/$TRACK_1" "$BOB"
expect "author deletes their own track, remotely → 200" 200

request DELETE "/playlists/$RADIO/tracks/$TRACK_3" "$ALICE"
expect "owner deletes any track → 200" 200

read_order "$ALICE" "$RADIO"
expect_json "only track 2 is left" ". == [\"$TRACK_2\"]"

section "GET /playlists/:playlistId/events (SSE)"
sleep 1
kill "$SSE_PID" 2>/dev/null
wait "$SSE_PID" 2>/dev/null
SSE_PID=""
BODY=$(grep '^data:' "$EVENTS_FILE" | sed 's/^data: *//' | jq -s '.')

expect_json "track.added tells after which track each one was placed" \
  "[.[] | select(.type == \"track.added\") | [.track.id, .afterTrackId]] == [[\"$TRACK_1\", null], [\"$TRACK_2\", \"$TRACK_1\"], [\"$TRACK_3\", \"$TRACK_2\"]]"
expect_json "track.moved received for the move to the top" \
  "any(.[]; .type == \"track.moved\" and .trackId == \"$TRACK_3\" and .afterTrackId == null and .version == 2)"
expect_json "a single track.moved for the two simultaneous moves" \
  "[.[] | select(.type == \"track.moved\" and .trackId == \"$TRACK_2\")] | length == 1"
expect_json "track.removed received for both deleted tracks" \
  "[.[] | select(.type == \"track.removed\") | .trackId] == [\"$TRACK_1\", \"$TRACK_3\"]"
expect_json "no event from another playlist" "all(.[]; .playlistId == \"$RADIO\")"

summary
