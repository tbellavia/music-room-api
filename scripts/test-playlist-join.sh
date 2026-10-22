#!/usr/bin/env bash
# Manual end-to-end check of public playlist listing and joining.
# Requires a running API (make start), curl and jq.
#
# Usage: ./scripts/test-playlist-join.sh [API_URL]

set -u

API="${1:-http://localhost:3000/api/v1}"
SUFFIX=$RANDOM
PASSWORD='Password123!x'

# 42 Paris
PLAYLIST_LATITUDE=48.8966
PLAYLIST_LONGITUDE=2.3184
LATITUDE_1500M_NORTH=48.9101
LATITUDE_2500M_NORTH=48.9191

RESPONSE_FILE=$(mktemp)
trap 'rm -f "$RESPONSE_FILE"' EXIT

PASSED=0
FAILED=0
STATUS=""
BODY=""

GREEN='\033[32m'
RED='\033[31m'
BOLD='\033[1m'
RESET='\033[0m'

# request METHOD PATH [TOKEN] [JSON_BODY] -> sets STATUS and BODY
request() {
  local method=$1
  local path=$2
  local token=${3:-}
  local data=${4:-}
  local args=(-s -o "$RESPONSE_FILE" -w '%{http_code}' -X "$method" "$API$path")

  if [ -n "$token" ]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  if [ -n "$data" ]; then
    args+=(-H 'Content-Type: application/json' -d "$data")
  fi

  STATUS=$(curl "${args[@]}")
  BODY=$(cat "$RESPONSE_FILE")
}

pass() {
  PASSED=$((PASSED + 1))
  printf "  ${GREEN}✔${RESET} %s\n" "$1"
}

fail() {
  FAILED=$((FAILED + 1))
  printf "  ${RED}✘ %s${RESET}\n" "$1"
  printf "      %s\n" "$2"
}

# expect DESCRIPTION EXPECTED_STATUS [EXPECTED_ERROR_CODE]
expect() {
  local description=$1
  local expected_status=$2
  local expected_error=${3:-}
  local actual_error

  if [ "$STATUS" != "$expected_status" ]; then
    fail "$description" "expected HTTP $expected_status, got $STATUS: $BODY"
    return
  fi
  if [ -n "$expected_error" ]; then
    actual_error=$(echo "$BODY" | jq -r '.error // empty' 2>/dev/null)
    if [ "$actual_error" != "$expected_error" ]; then
      fail "$description" "expected error $expected_error, got: $BODY"
      return
    fi
  fi
  pass "$description"
}

section() {
  printf "\n${BOLD}%s${RESET}\n" "$1"
}

register_and_login() {
  local username=$1
  local token

  request POST /identity/register "" \
    "{\"username\":\"$username\",\"email\":\"$username@test.com\",\"password\":\"$PASSWORD\"}"
  if [ "$STATUS" != "201" ]; then
    echo "Cannot register $username (HTTP $STATUS): $BODY" >&2
    exit 1
  fi

  request POST /identity/login "" \
    "{\"username\":\"$username\",\"password\":\"$PASSWORD\"}"
  token=$(echo "$BODY" | jq -r '.access_token // empty')
  if [ -z "$token" ]; then
    echo "Cannot log in $username (HTTP $STATUS): $BODY" >&2
    exit 1
  fi
  echo "$token"
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

for command in curl jq; do
  if ! command -v "$command" >/dev/null; then
    echo "$command is required" >&2
    exit 1
  fi
done

request GET /health
if [ "$STATUS" != "200" ]; then
  echo "API is not reachable at $API (run: make start)" >&2
  exit 1
fi

section "Setup"
ALICE=$(register_and_login "alice$SUFFIX") || exit 1
BOB=$(register_and_login "bob$SUFFIX") || exit 1
echo "  owner: alice$SUFFIX, joiner: bob$SUFFIX"

LOCATION="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE"
PUBLIC=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Public $SUFFIX\",\"description\":\"\",$LOCATION}") || exit 1
PRIVATE=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Private $SUFFIX\",\"description\":\"\",\"isPrivate\":true,$LOCATION}") || exit 1
FUTURE=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Future $SUFFIX\",\"description\":\"\",\"beginAt\":\"2030-01-01T20:00:00Z\",\"endAt\":\"2030-01-02T04:00:00Z\",$LOCATION}") || exit 1
ENDED=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Ended $SUFFIX\",\"description\":\"\",\"beginAt\":\"2020-01-01T20:00:00Z\",\"endAt\":\"2020-01-02T04:00:00Z\",$LOCATION}") || exit 1
echo "  playlists created: public, private, future, ended"

section "GET /playlists/public"
request GET /playlists/public
expect "without token → 401" 401

request GET /playlists/public "$BOB"
expect "with token → 200" 200
if is_listed "$PUBLIC"; then pass "public playlist is listed"; else fail "public playlist is listed" "$BODY"; fi
if is_listed "$FUTURE"; then pass "not yet started playlist is listed"; else fail "not yet started playlist is listed" "$BODY"; fi
if is_listed "$PRIVATE"; then fail "private playlist is not listed" "$BODY"; else pass "private playlist is not listed"; fi
if is_listed "$ENDED"; then fail "ended playlist is not listed" "$BODY"; else pass "ended playlist is not listed"; fi

section "POST /playlists/:playlistId/join"
request POST "/playlists/$PUBLIC/join" "" \
  "{\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE}"
expect "without token → 401" 401

join "$BOB" "$PUBLIC" "$LATITUDE_2500M_NORTH"
expect "2.5 km away → 403 OUTSIDE_PLAYLIST_ZONE" 403 OUTSIDE_PLAYLIST_ZONE

join "$BOB" "$PUBLIC" "$LATITUDE_1500M_NORTH"
expect "1.5 km away → 201" 201
PARTICIPANT_ID=$(echo "$BODY" | jq -r '.participantId // empty')
if [ -n "$PARTICIPANT_ID" ]; then pass "response contains participantId"; else fail "response contains participantId" "$BODY"; fi

join "$BOB" "$PUBLIC" "$LATITUDE_1500M_NORTH"
expect "join twice → 409 ALREADY_PARTICIPANT" 409 ALREADY_PARTICIPANT

join "$ALICE" "$PUBLIC" "$PLAYLIST_LATITUDE"
expect "owner joins own playlist → 409 ALREADY_PARTICIPANT" 409 ALREADY_PARTICIPANT

join "$BOB" "$PRIVATE" "$PLAYLIST_LATITUDE"
expect "private playlist → 403 PRIVATE_PLAYLIST" 403 PRIVATE_PLAYLIST

join "$BOB" "$ENDED" "$PLAYLIST_LATITUDE"
expect "ended playlist → 410 PLAYLIST_ENDED" 410 PLAYLIST_ENDED

join "$BOB" "$FUTURE" "$PLAYLIST_LATITUDE"
expect "not yet started playlist → 201" 201

join "$BOB" "00000000-0000-0000-0000-000000000000" "$PLAYLIST_LATITUDE"
expect "unknown playlist → 404 PLAYLIST_NOT_FOUND" 404 PLAYLIST_NOT_FOUND

section "Body validation"
join "$BOB" "$PUBLIC" 95
expect "latitude out of range → 400" 400

request POST "/playlists/$PUBLIC/join" "$BOB" "{\"latitude\":$PLAYLIST_LATITUDE}"
expect "missing longitude → 400" 400

request POST "/playlists/$PUBLIC/join" "$BOB" \
  "{\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE,\"hack\":true}"
expect "unknown field → 400" 400

printf "\n${BOLD}%d passed, %d failed${RESET}\n" "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ]
