#!/usr/bin/env bash
# Manual end-to-end check of playlist invitations and participants management.
# Requires a running API (make start), curl and jq.
#
# Usage: ./scripts/test-playlist-participants.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# 42 Paris
PLAYLIST_LATITUDE=48.8966
PLAYLIST_LONGITUDE=2.3184

UNKNOWN_ID="00000000-0000-0000-0000-000000000000"

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

# invite TOKEN PLAYLIST_ID ACCOUNT_ID
invite() {
  request POST "/playlists/$2/invitations" "$1" "{\"accountId\":\"$3\"}"
}

# accept TOKEN INVITATION_ID
accept() {
  request POST "/playlists/invitations/$2/accept" "$1"
}

# set_privilege TOKEN PLAYLIST_ID PARTICIPANT_ID true|false
set_privilege() {
  request PATCH "/playlists/$2/participants/$3" "$1" "{\"hasPrivilege\":$4}"
}

# json_field FIELD -> reads a field of the last response
json_field() {
  echo "$BODY" | jq -r ".$1 // empty"
}

preflight

section "Setup"
ALICE_ID=$(register "alice$SUFFIX") || exit 1
BOB_ID=$(register "bob$SUFFIX") || exit 1
CAROL_ID=$(register "carol$SUFFIX") || exit 1
DAVE_ID=$(register "dave$SUFFIX") || exit 1
ALICE=$(login "alice$SUFFIX") || exit 1
BOB=$(login "bob$SUFFIX") || exit 1
CAROL=$(login "carol$SUFFIX") || exit 1
DAVE=$(login "dave$SUFFIX") || exit 1
echo "  owner: alice$SUFFIX, others: bob$SUFFIX, carol$SUFFIX, dave$SUFFIX"

LOCATION="\"latitude\":$PLAYLIST_LATITUDE,\"longitude\":$PLAYLIST_LONGITUDE"
PRIVATE=$(create_playlist "$ALICE" \
  "{\"type\":\"VOTE\",\"name\":\"Private $SUFFIX\",\"description\":\"\",\"isPrivate\":true,$LOCATION}") || exit 1
FUTURE=$(create_playlist "$ALICE" \
  "{\"type\":\"EDITOR\",\"name\":\"Future $SUFFIX\",\"description\":\"\",\"isPrivate\":true,\"beginAt\":\"2030-01-01T20:00:00Z\",$LOCATION}") || exit 1
echo "  playlists created: private (running), future (not started)"

section "POST /playlists/:playlistId/invitations (owner)"
request POST "/playlists/$PRIVATE/invitations" "" "{\"accountId\":\"$BOB_ID\"}"
expect "without token → 401" 401

invite "$BOB" "$PRIVATE" "$CAROL_ID"
expect "non member invites → 403 INVITATION_FORBIDDEN" 403 INVITATION_FORBIDDEN

invite "$ALICE" "$PRIVATE" "not-a-uuid"
expect "invalid accountId → 400" 400

invite "$ALICE" "$PRIVATE" "$UNKNOWN_ID"
expect "unknown account → 404 ACCOUNT_NOT_FOUND" 404 ACCOUNT_NOT_FOUND

invite "$ALICE" "$PRIVATE" "$ALICE_ID"
expect "owner invites herself → 409 ALREADY_PARTICIPANT" 409 ALREADY_PARTICIPANT

invite "$ALICE" "$UNKNOWN_ID" "$BOB_ID"
expect "unknown playlist → 404 PLAYLIST_NOT_FOUND" 404 PLAYLIST_NOT_FOUND

invite "$ALICE" "$PRIVATE" "$BOB_ID"
expect "owner invites bob → 201" 201
INVITATION_BOB=$(json_field invitationId)

invite "$ALICE" "$PRIVATE" "$BOB_ID"
expect "invite bob twice → 409 INVITATION_ALREADY_EXISTS" 409 INVITATION_ALREADY_EXISTS

section "GET /playlists/invitations"
request GET /playlists/invitations "$BOB"
expect "bob lists his invitations → 200" 200
expect_json "bob sees the invitation with playlist name and inviter" \
  "any(.invitations[]; .id == \"$INVITATION_BOB\" and .playlistName == \"Private $SUFFIX\" and .inviterUsername == \"alice$SUFFIX\")"

request GET /playlists/invitations "$ALICE"
expect_json "alice does not see the invitation she sent" \
  "all(.invitations[]; .id != \"$INVITATION_BOB\")"

section "POST /playlists/invitations/:invitationId/accept"
accept "$CAROL" "$INVITATION_BOB"
expect "someone else accepts → 404 INVITATION_NOT_FOUND" 404 INVITATION_NOT_FOUND

accept "$BOB" "$INVITATION_BOB"
expect "bob accepts → 201" 201
BOB_PARTICIPANT=$(json_field participantId)

accept "$BOB" "$INVITATION_BOB"
expect "accept twice → 404 INVITATION_NOT_FOUND" 404 INVITATION_NOT_FOUND

section "GET /playlists/:playlistId/participants"
request GET "/playlists/$PRIVATE/participants" "$CAROL"
expect "non member → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

request GET "/playlists/$PRIVATE/participants" "$BOB"
expect "participant lists participants → 200" 200
expect_json "owner is alice" ".owner.accountId == \"$ALICE_ID\" and .owner.username == \"alice$SUFFIX\""
expect_json "bob is listed without privilege" \
  "any(.participants[]; .participantId == \"$BOB_PARTICIPANT\" and .username == \"bob$SUFFIX\" and .hasPrivilege == false)"

section "PATCH /playlists/:playlistId/participants/:participantId"
invite "$BOB" "$PRIVATE" "$CAROL_ID"
expect "regular participant invites → 403 INVITATION_FORBIDDEN" 403 INVITATION_FORBIDDEN

set_privilege "$BOB" "$PRIVATE" "$BOB_PARTICIPANT" true
expect "bob promotes himself → 403 NOT_PLAYLIST_OWNER" 403 NOT_PLAYLIST_OWNER

set_privilege "$ALICE" "$PRIVATE" "$UNKNOWN_ID" true
expect "unknown participant → 404 PARTICIPANT_NOT_FOUND" 404 PARTICIPANT_NOT_FOUND

request PATCH "/playlists/$PRIVATE/participants/$BOB_PARTICIPANT" "$ALICE" '{"hasPrivilege":"yes"}'
expect "non boolean hasPrivilege → 400" 400

set_privilege "$ALICE" "$PRIVATE" "$BOB_PARTICIPANT" true
expect "owner promotes bob → 200" 200

request GET "/playlists/$PRIVATE/participants" "$ALICE"
expect_json "bob now has the privilege" \
  "any(.participants[]; .participantId == \"$BOB_PARTICIPANT\" and .hasPrivilege == true)"

section "Privileged participant invites"
invite "$BOB" "$PRIVATE" "$CAROL_ID"
expect "privileged participant invites carol → 201" 201
INVITATION_CAROL=$(json_field invitationId)

section "DELETE /playlists/invitations/:invitationId/cancel"
request DELETE "/playlists/invitations/$INVITATION_CAROL/cancel" "$ALICE"
expect "owner cancels bob's invitation → 404 INVITATION_NOT_FOUND" 404 INVITATION_NOT_FOUND

request DELETE "/playlists/invitations/$INVITATION_CAROL/cancel" "$CAROL"
expect "invitee cancels → 404 INVITATION_NOT_FOUND" 404 INVITATION_NOT_FOUND

request DELETE "/playlists/invitations/$INVITATION_CAROL/cancel" "$BOB"
expect "inviter cancels → 200" 200

request GET /playlists/invitations "$CAROL"
expect_json "cancelled invitation is gone" \
  "all(.invitations[]; .id != \"$INVITATION_CAROL\")"

section "DELETE /playlists/invitations/:invitationId/decline"
invite "$BOB" "$PRIVATE" "$CAROL_ID"
INVITATION_CAROL=$(json_field invitationId)

request DELETE "/playlists/invitations/$INVITATION_CAROL/decline" "$BOB"
expect "inviter declines → 404 INVITATION_NOT_FOUND" 404 INVITATION_NOT_FOUND

request DELETE "/playlists/invitations/$INVITATION_CAROL/decline" "$CAROL"
expect "invitee declines → 200" 200

accept "$CAROL" "$INVITATION_CAROL"
expect "declined invitation cannot be accepted → 404 INVITATION_NOT_FOUND" 404 INVITATION_NOT_FOUND

section "Revoked privilege"
set_privilege "$ALICE" "$PRIVATE" "$BOB_PARTICIPANT" false
expect "owner revokes bob's privilege → 200" 200

invite "$BOB" "$PRIVATE" "$DAVE_ID"
expect "bob invites again → 403 INVITATION_FORBIDDEN" 403 INVITATION_FORBIDDEN

section "Playlist not started yet"
invite "$ALICE" "$FUTURE" "$BOB_ID"
expect "owner invites before start → 201" 201
INVITATION_FUTURE=$(json_field invitationId)

accept "$BOB" "$INVITATION_FUTURE"
expect "bob accepts before start → 201" 201
BOB_FUTURE_PARTICIPANT=$(json_field participantId)

set_privilege "$ALICE" "$FUTURE" "$BOB_FUTURE_PARTICIPANT" true
invite "$BOB" "$FUTURE" "$CAROL_ID"
expect "privileged participant invites before start → 201" 201

section "DELETE /playlists/:playlistId/participants/:participantId"
invite "$ALICE" "$PRIVATE" "$CAROL_ID"
accept "$CAROL" "$(json_field invitationId)"
CAROL_PARTICIPANT=$(json_field participantId)

request DELETE "/playlists/$PRIVATE/participants/$CAROL_PARTICIPANT" "$BOB"
expect "participant removes someone → 403 NOT_PLAYLIST_OWNER" 403 NOT_PLAYLIST_OWNER

request DELETE "/playlists/$PRIVATE/participants/$UNKNOWN_ID" "$ALICE"
expect "unknown participant → 404 PARTICIPANT_NOT_FOUND" 404 PARTICIPANT_NOT_FOUND

request DELETE "/playlists/$FUTURE/participants/$CAROL_PARTICIPANT" "$ALICE"
expect "participant of another playlist → 404 PARTICIPANT_NOT_FOUND" 404 PARTICIPANT_NOT_FOUND

request DELETE "/playlists/$PRIVATE/participants/$CAROL_PARTICIPANT" "$ALICE"
expect "owner removes carol → 200" 200

request GET "/playlists/$PRIVATE/participants" "$CAROL"
expect "removed participant can no longer list → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

section "POST /playlists/:playlistId/leave"
request POST "/playlists/$PRIVATE/leave" "$ALICE"
expect "owner leaves → 404 PARTICIPANT_NOT_FOUND" 404 PARTICIPANT_NOT_FOUND

request POST "/playlists/$PRIVATE/leave" "$DAVE"
expect "non participant leaves → 404 PARTICIPANT_NOT_FOUND" 404 PARTICIPANT_NOT_FOUND

request POST "/playlists/$PRIVATE/leave" "$BOB"
expect "bob leaves → 201" 201

request GET "/playlists/$PRIVATE/participants" "$BOB"
expect "bob can no longer list → 403 NOT_PLAYLIST_MEMBER" 403 NOT_PLAYLIST_MEMBER

summary
