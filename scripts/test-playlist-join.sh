#!/usr/bin/env bash
# Manual end-to-end check of public playlist listing and joining.
# Requires curl and jq.
# Run through `make test-e2e`: the API must be in E2E mode to verify the accounts.
#
# Usage: make test-e2e, or ./scripts/test-playlist-join.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# 42 Paris
PLAYLIST_LATITUDE=48.8966
PLAYLIST_LONGITUDE=2.3184
LATITUDE_400M_NORTH=48.9002
LATITUDE_600M_NORTH=48.9020

register_and_login() {
  register "$1" >/dev/null || exit 1
  login "$1"
}

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

# join TOKEN PLAYLIST_ID LATITUDE
join() {
  request POST "/playlists/$2/join" "$1" \
    "{\"latitude\":$3,\"longitude\":$PLAYLIST_LONGITUDE}"
}

# is_listed PLAYLIST_ID -> uses BODY from the last listing request
is_listed() {
  echo "$BODY" | jq -e --arg id "$1" 'any(.playlists[]; .id == $id)' >/dev/null
}

# utc_in_seconds N -> ISO 8601 date N seconds from now (BSD and GNU date)
utc_in_seconds() {
  date -u -v+"$1"S +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || date -u -d "+$1 seconds" +%Y-%m-%dT%H:%M:%SZ
}

preflight

section "Setup"
ALICE=$(register_and_login "alice$SUFFIX") || exit 1
BOB=$(register_and_login "bob$SUFFIX") || exit 1
echo "  owner: alice$SUFFIX, joiner: bob$SUFFIX"

LOCATION="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE,\"address\":\"96 boulevard Bessières, Paris\""
PUBLIC=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Public $SUFFIX\",\"description\":\"\",$LOCATION}") || exit 1
PRIVATE=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Private $SUFFIX\",\"description\":\"\",\"isPrivate\":true}") || exit 1
EDITOR=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Editor $SUFFIX\",\"description\":\"\"}") || exit 1
FUTURE=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Future $SUFFIX\",\"description\":\"\",\"beginAt\":\"2030-01-01T20:00:00Z\",\"endAt\":\"2030-01-02T04:00:00Z\",$LOCATION}") || exit 1
# A playlist cannot be created already ended: create it ending soon, then wait
ENDED=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Ended $SUFFIX\",\"description\":\"\",\"endAt\":\"$(utc_in_seconds 2)\",$LOCATION}") || exit 1
echo "  playlists created: public, private, future, ended (waiting for it to end...)"
sleep 3

section "POST /playlists"
request POST /playlists "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Past $SUFFIX\",\"description\":\"\",\"beginAt\":\"2020-01-01T20:00:00Z\",\"endAt\":\"2020-01-02T04:00:00Z\",$LOCATION}"
expect "endAt in the past → 400 PLAYLIST_END_IN_PAST" 400 PLAYLIST_END_IN_PAST

request POST /playlists "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Started $SUFFIX\",\"description\":\"\",\"beginAt\":\"2020-01-01T20:00:00Z\",\"endAt\":\"2030-01-02T04:00:00Z\",$LOCATION}"
expect "already begun but ends in the future → 201" 201

request POST /playlists "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"No location $SUFFIX\",\"description\":\"\"}"
expect "VOTE without location → 400 LATITUDE_INVALID" 400 LATITUDE_INVALID

request POST /playlists "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Located $SUFFIX\",\"description\":\"\",$LOCATION}"
expect "EDITOR with a location → 400 LOCATION_NOT_ALLOWED" 400 LOCATION_NOT_ALLOWED

request POST /playlists "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Half located $SUFFIX\",\"description\":\"\",\"latitude\":$PLAYLIST_LATITUDE}"
expect "EDITOR with a latitude only → 400 LOCATION_NOT_ALLOWED" 400 LOCATION_NOT_ALLOWED

request POST /playlists "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Addressed $SUFFIX\",\"description\":\"\",\"address\":\"Paris\"}"
expect "EDITOR with an address only → 400 LOCATION_NOT_ALLOWED" 400 LOCATION_NOT_ALLOWED

COORDINATES="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE"
request POST /playlists "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"No address $SUFFIX\",\"description\":\"\",$COORDINATES}"
expect "VOTE without address → 400 ADDRESS_INVALID" 400 ADDRESS_INVALID

request POST /playlists "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Blank address $SUFFIX\",\"description\":\"\",$COORDINATES,\"address\":\"   \"}"
expect "VOTE with a blank address → 400 ADDRESS_INVALID" 400 ADDRESS_INVALID

request POST /playlists "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Number address $SUFFIX\",\"description\":\"\",$COORDINATES,\"address\":42}"
expect "VOTE with an address that is not a string → 400 ADDRESS_INVALID" 400 ADDRESS_INVALID

LONG_ADDRESS=$(printf 'a%.0s' $(seq 1 256))
request POST /playlists "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Long address $SUFFIX\",\"description\":\"\",$COORDINATES,\"address\":\"$LONG_ADDRESS\"}"
expect "VOTE with an address of 256 characters → 400 ADDRESS_TOO_LONG" 400 ADDRESS_TOO_LONG

section "GET /playlists/public"
request GET /playlists/public
expect "without token → 401 UNAUTHORIZED" 401 UNAUTHORIZED

request GET /playlists/public "$BOB"
expect "with token → 200" 200
if is_listed "$PUBLIC"; then pass "public playlist is listed"; else fail "public playlist is listed" "$BODY"; fi
if is_listed "$FUTURE"; then pass "not yet started playlist is listed"; else fail "not yet started playlist is listed" "$BODY"; fi
if is_listed "$PRIVATE"; then fail "private playlist is not listed" "$BODY"; else pass "private playlist is not listed"; fi
if is_listed "$ENDED"; then fail "ended playlist is not listed" "$BODY"; else pass "ended playlist is not listed"; fi
expect_json "EDITOR playlist listed without location nor address" \
  "any(.playlists[]; .id == \"$EDITOR\" and .latitude == null and .longitude == null and .address == null)"
expect_json "VOTE playlist listed with its location and address" \
  "any(.playlists[]; .id == \"$PUBLIC\" and .latitude == $PLAYLIST_LATITUDE and .address == \"96 boulevard Bessières, Paris\")"

section "POST /playlists/:playlistId/join"
request POST "/playlists/$PUBLIC/join" "" \
  "{\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE}"
expect "without token → 401 UNAUTHORIZED" 401 UNAUTHORIZED

join "$BOB" "$PUBLIC" "$LATITUDE_600M_NORTH"
expect "600 m away → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

request POST "/playlists/$PUBLIC/join" "$BOB" "{}"
expect "VOTE without position → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

request POST "/playlists/$PUBLIC/join" "$BOB" "{\"latitude\":$PLAYLIST_LATITUDE}"
expect "VOTE with a latitude only → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

join "$BOB" "$PUBLIC" "$LATITUDE_400M_NORTH"
expect "400 m away → 201" 201
PARTICIPANT_ID=$(echo "$BODY" | jq -r '.participantId // empty')
if [ -n "$PARTICIPANT_ID" ]; then pass "response contains participantId"; else fail "response contains participantId" "$BODY"; fi

join "$BOB" "$PUBLIC" "$LATITUDE_400M_NORTH"
expect "join twice → 409 ALREADY_PARTICIPANT" 409 ALREADY_PARTICIPANT

join "$ALICE" "$PUBLIC" "$PLAYLIST_LATITUDE"
expect "owner joins own playlist → 409 ALREADY_PARTICIPANT" 409 ALREADY_PARTICIPANT

request POST "/playlists/$EDITOR/join" "$BOB" "{}"
expect "EDITOR without position → 201" 201

join "$BOB" "$PRIVATE" "$PLAYLIST_LATITUDE"
expect "private playlist → 403 PRIVATE_PLAYLIST" 403 PRIVATE_PLAYLIST

join "$BOB" "$ENDED" "$PLAYLIST_LATITUDE"
expect "ended playlist → 410 PLAYLIST_ENDED" 410 PLAYLIST_ENDED

join "$BOB" "$FUTURE" "$PLAYLIST_LATITUDE"
expect "not yet started playlist → 403 PLAYLIST_NOT_STARTED" 403 PLAYLIST_NOT_STARTED

join "$BOB" "00000000-0000-0000-0000-000000000000" "$PLAYLIST_LATITUDE"
expect "unknown playlist → 404 PLAYLIST_NOT_FOUND" 404 PLAYLIST_NOT_FOUND

section "Body validation"
join "$BOB" "$PUBLIC" 95
expect "latitude out of range → 400 LATITUDE_OUT_OF_RANGE" 400 LATITUDE_OUT_OF_RANGE

request POST "/playlists/$PUBLIC/join" "$BOB" \
  "{\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE,\"hack\":true}"
expect "unknown field → 400" 400

summary
