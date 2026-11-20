#!/usr/bin/env bash
# Manual end-to-end check of the playlist listings: my playlists, my recent
# playlists and the public events to discover.
# Requires curl and jq.
# Run through `make test-e2e`: the API must be in E2E mode to verify the accounts.
#
# Usage: make test-e2e, or ./scripts/test-playlist-listings.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# The database keeps the events of previous runs: the events of this run are
# placed in the South Pacific, at a spot that depends on SUFFIX, so that the
# closest events are the ones created here
EVENT_LATITUDE=$(awk -v suffix="$SUFFIX" 'BEGIN { printf "%.6f", -40 - suffix / 4000 }')
EVENT_LONGITUDE=-140
# ~300 m and ~5 km north of the event
LATITUDE_300M_NORTH=$(awk -v base="$EVENT_LATITUDE" 'BEGIN { printf "%.6f", base + 0.0027 }')
LATITUDE_5KM_NORTH=$(awk -v base="$EVENT_LATITUDE" 'BEGIN { printf "%.6f", base + 0.045 }')

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

# vote_event TOKEN NAME LATITUDE BEGIN_AT -> prints the playlist id
vote_event() {
  create_playlist "$1" \
    "{\"type\":\"VOTE\",\"name\":\"$2 $SUFFIX\",\"description\":\"\",\"beginAt\":\"$4\",\"latitude\":$3,\"longitude\":$EVENT_LONGITUDE,\"address\":\"Pacifique Sud\"}"
}

# ids -> the ids of the last listing, one per line
ids() {
  echo "$BODY" | jq -r '.playlists[].id'
}

preflight

section "Setup"
ALICE_ID=$(register "alice$SUFFIX") || exit 1
ALICE=$(login "alice$SUFFIX") || exit 1
BOB_ID=$(register "bob$SUFFIX") || exit 1
BOB=$(login "bob$SUFFIX") || exit 1
echo "  alice$SUFFIX lists, bob$SUFFIX creates the events"

FIRST=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"First $SUFFIX\",\"description\":\"\",\"isPrivate\":true}") || exit 1
SECOND=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Second $SUFFIX\",\"description\":\"\",\"beginAt\":\"2099-01-01T20:00:00Z\"}") || exit 1

LIVE_NEAR=$(vote_event "$BOB" "Live near" "$LATITUDE_300M_NORTH" "2020-01-01T20:00:00Z") || exit 1
UPCOMING_HERE=$(vote_event "$BOB" "Upcoming here" "$EVENT_LATITUDE" "2099-01-01T20:00:00Z") || exit 1
LIVE_FAR=$(vote_event "$BOB" "Live far" "$LATITUDE_5KM_NORTH" "2020-01-01T20:00:00Z") || exit 1
JOINED=$(vote_event "$BOB" "Joined" "$EVENT_LATITUDE" "2020-01-01T20:00:00Z") || exit 1
NO_DATE=$(create_playlist "$BOB" \
  "{\"type\":\"VOTE\",\"name\":\"No date $SUFFIX\",\"description\":\"\",\"latitude\":$EVENT_LATITUDE,\"longitude\":$EVENT_LONGITUDE,\"address\":\"Pacifique Sud\"}") || exit 1

request POST "/playlists/$JOINED/join" "$ALICE" \
  "{\"latitude\":$EVENT_LATITUDE,\"longitude\":$EVENT_LONGITUDE}"
if [ "$STATUS" != "201" ]; then
  echo "Alice cannot join (HTTP $STATUS): $BODY" >&2
  exit 1
fi
echo "  alice owns 2 playlists and joined 1 of bob's 5"

section "GET /playlists/me"
request GET /playlists/me "$ALICE"
expect "lists the playlists of the caller → 200" 200
expect_json "owned and joined playlists, most recent first" \
  "[.playlists[].id] == [\"$JOINED\", \"$SECOND\", \"$FIRST\"]"
expect_json "gives the role and the privilege" \
  "(.playlists[0] | .role == \"PARTICIPANT\" and .hasPrivilege == false) and (.playlists[2] | .role == \"OWNER\" and .hasPrivilege == true)"
expect_json "gives the username of the owner" \
  "(.playlists[0].ownerUsername == \"bob$SUFFIX\") and (.playlists[2].ownerUsername == \"alice$SUFFIX\")"
expect_json "includes the private playlist" \
  ".playlists[2].isPrivate == true"
expect_json "gives the address, null for an EDITOR playlist" \
  "(.playlists[0].address == \"Pacifique Sud\") and (.playlists[2].address == null)"
expect_json "gives the status" \
  "[.playlists[].status] == [\"LIVE\", \"UPCOMING\", \"LIVE\"]"
expect_json "no distance and nothing to join: the caller is a member" \
  "all(.playlists[]; .distanceMeters == null and .canJoinHere == false)"

request GET "/playlists/me?order=ASC" "$ALICE"
expect_json "order=ASC → oldest first" \
  "[.playlists[].id] == [\"$FIRST\", \"$SECOND\", \"$JOINED\"]"

request GET "/playlists/me?role=OWNER" "$ALICE"
expect_json "role=OWNER → only the owned playlists" \
  "[.playlists[].id] == [\"$SECOND\", \"$FIRST\"]"

request GET "/playlists/me?role=PARTICIPANT&status=LIVE" "$ALICE"
expect_json "role=PARTICIPANT&status=LIVE → only the joined playlist" \
  "[.playlists[].id] == [\"$JOINED\"]"

request GET "/playlists/me?status=UPCOMING" "$ALICE"
expect_json "status=UPCOMING → only the upcoming playlist" \
  "[.playlists[].id] == [\"$SECOND\"]"

request GET "/playlists/me?role=ADMIN" "$ALICE"
expect "unknown role → 400 ROLE_INVALID" 400 ROLE_INVALID

request GET "/playlists/me?status=SOON" "$ALICE"
expect "unknown status → 400 STATUS_INVALID" 400 STATUS_INVALID

request GET "/playlists/me?order=random" "$ALICE"
expect "unknown order → 400 ORDER_INVALID" 400 ORDER_INVALID

request GET "/playlists/me?page=2" "$ALICE"
expect "unknown parameter → 400 UNKNOWN_FIELD" 400 UNKNOWN_FIELD

request GET /playlists/me
expect "without token → 401" 401

section "GET /playlists/me/recent"
request GET /playlists/me/recent "$ALICE"
expect "lists the playlists created by the caller → 200" 200
expect_json "only the created ones, most recent first" \
  "[.playlists[].id] == [\"$SECOND\", \"$FIRST\"]"
expect_json "the owner is always the caller" \
  "all(.playlists[]; .ownerUsername == \"alice$SUFFIX\")"

for index in $(seq 1 10); do
  create_playlist "$ALICE" \
    "{\"type\":\"EDITOR\",\"name\":\"Bulk $index $SUFFIX\",\"description\":\"\"}" >/dev/null || exit 1
done
request GET /playlists/me/recent "$ALICE"
expect_json "after 12 creations: the 10 most recent" \
  "(.playlists | length) == 10 and .playlists[0].name == \"Bulk 10 $SUFFIX\" and all(.playlists[]; .id != \"$FIRST\" and .id != \"$SECOND\")"

request GET /playlists/me/recent
expect "without token → 401" 401

section "GET /playlists/public"
request GET /playlists/public "$ALICE"
expect "lists the public playlists → 200" 200
expect_json "same format as GET /playlists/me" \
  "all(.playlists[]; has(\"isPrivate\") and has(\"createdAt\") and has(\"status\") and has(\"role\") and has(\"hasPrivilege\") and has(\"distanceMeters\") and has(\"canJoinHere\"))"
expect_json "gives the username of the owner" \
  "(.playlists[] | select(.id == \"$LIVE_NEAR\") | .ownerUsername) == \"bob$SUFFIX\""
expect_json "gives the role of the caller: OWNER, PARTICIPANT or null" \
  "([.playlists[] | select(.id == \"$SECOND\") | .role] == [\"OWNER\"]) and ([.playlists[] | select(.id == \"$JOINED\") | .role] == [\"PARTICIPANT\"]) and ([.playlists[] | select(.id == \"$LIVE_NEAR\") | .role] == [null])"
expect_json "without position: no distance, no VOTE playlist to join" \
  "all(.playlists[]; .distanceMeters == null) and ([.playlists[] | select(.id == \"$LIVE_NEAR\") | .canJoinHere] == [false])"

request GET "/playlists/public?latitude=$EVENT_LATITUDE&longitude=$EVENT_LONGITUDE" "$ALICE"
expect "with a position → 200" 200
expect_json "gives the distance to the VOTE playlists" \
  "([.playlists[] | select(.id == \"$UPCOMING_HERE\") | .distanceMeters] == [0]) and ([.playlists[] | select(.id == \"$LIVE_NEAR\") | .distanceMeters | . > 250 and . < 350] == [true])"
expect_json "canJoinHere: live and in the zone only, never for a member" \
  "([.playlists[] | select(.id == \"$LIVE_NEAR\") | .canJoinHere] == [true]) and ([.playlists[] | select(.id == \"$LIVE_FAR\" or .id == \"$UPCOMING_HERE\" or .id == \"$JOINED\") | .canJoinHere] | length == 3 and all(. == false))"

request GET "/playlists/public?latitude=$EVENT_LATITUDE" "$ALICE"
expect "latitude without longitude → 400 LONGITUDE_INVALID" 400 LONGITUDE_INVALID

section "GET /playlists/events (soonest)"
request GET /playlists/events "$ALICE"
expect "lists the events → 200" 200
expect_json "at most 10 events" \
  "(.playlists | length) <= 10"
expect_json "soonest first" \
  "[.playlists[].beginAt] == ([.playlists[].beginAt] | sort)"
expect_json "no distance without position" \
  "all(.playlists[]; .distanceMeters == null)"
expect_json "never an event of the caller, owned or joined" \
  "all(.playlists[]; .ownerId != \"$ALICE_ID\" and .id != \"$JOINED\")"

section "GET /playlists/events (closest)"
request GET "/playlists/events?latitude=$EVENT_LATITUDE&longitude=$EVENT_LONGITUDE" "$ALICE"
expect "lists the closest events → 200" 200
expect_json "closest first: here, then 300 m, then 5 km" \
  "[.playlists[0:3][].id] == [\"$UPCOMING_HERE\", \"$LIVE_NEAR\", \"$LIVE_FAR\"]"
expect_json "gives the distance in meters" \
  ".playlists[0].distanceMeters == 0 and (.playlists[1].distanceMeters | . > 250 and . < 350)"
expect_json "excludes the joined playlist and the one without date" \
  "all(.playlists[]; .id != \"$JOINED\" and .id != \"$NO_DATE\")"
expect_json "only VOTE events" \
  "all(.playlists[]; .type == \"VOTE\")"
expect_json "gives the username of the owner" \
  "all(.playlists[0:3][]; .ownerUsername == \"bob$SUFFIX\")"
expect_json "gives the address" \
  "all(.playlists[0:3][]; .address == \"Pacifique Sud\")"
expect_json "canJoinHere: live within 500 m only" \
  "(.playlists[0].canJoinHere == false) and (.playlists[1].canJoinHere == true) and (.playlists[2].canJoinHere == false)"

request GET "/playlists/events?latitude=$EVENT_LATITUDE&longitude=$EVENT_LONGITUDE" "$BOB"
expect_json "the owner does not see their own events" \
  "all(.playlists[]; .ownerId != \"$BOB_ID\")"

request GET "/playlists/events?latitude=$EVENT_LATITUDE" "$ALICE"
expect "latitude without longitude → 400 LONGITUDE_INVALID" 400 LONGITUDE_INVALID

request GET "/playlists/events?longitude=$EVENT_LONGITUDE" "$ALICE"
expect "longitude without latitude → 400 LATITUDE_INVALID" 400 LATITUDE_INVALID

request GET "/playlists/events?latitude=abc&longitude=2" "$ALICE"
expect "latitude not a number → 400 LATITUDE_INVALID" 400 LATITUDE_INVALID

request GET "/playlists/events?latitude=91&longitude=2" "$ALICE"
expect "latitude out of range → 400 LATITUDE_OUT_OF_RANGE" 400 LATITUDE_OUT_OF_RANGE

request GET /playlists/events
expect "without token → 401" 401

summary
