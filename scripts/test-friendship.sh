#!/usr/bin/env bash
# Manual end-to-end check of friendship requests.
# Requires a running API (make start), curl and jq.
#
# Usage: ./scripts/test-friendship.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

UNKNOWN_ID="00000000-0000-0000-0000-000000000000"

# send_request TOKEN RECEIVER_ID
send_request() {
  request POST "/social/friends/request/$2" "$1"
}

# accept_request TOKEN REQUEST_ID
accept_request() {
  request POST "/social/friends/request/$2/accept" "$1"
}

# cancel_request TOKEN REQUEST_ID
cancel_request() {
  request DELETE "/social/friends/request/$2/cancel" "$1"
}

# reject_request TOKEN REQUEST_ID
reject_request() {
  request DELETE "/social/friends/request/$2/reject" "$1"
}

pending_requests() {
  request GET /social/friends/request/pending "$1"
}

preflight

section "Setup"
ALICE_ID=$(register "alice$SUFFIX") || exit 1
BOB_ID=$(register "bob$SUFFIX") || exit 1
CAROL_ID=$(register "carol$SUFFIX") || exit 1
ALICE=$(login "alice$SUFFIX") || exit 1
BOB=$(login "bob$SUFFIX") || exit 1
CAROL=$(login "carol$SUFFIX") || exit 1
echo "  users: alice$SUFFIX, bob$SUFFIX, carol$SUFFIX"

section "POST /social/friends/request/:receiverId"
request POST "/social/friends/request/$BOB_ID"
expect "without token → 401" 401

send_request "$ALICE" "$ALICE_ID"
expect "to oneself → 400 SELF_FRIENDSHIP" 400 SELF_FRIENDSHIP

send_request "$ALICE" "$BOB_ID"
expect "alice → bob → 201" 201
ALICE_TO_BOB=$(echo "$BODY" | jq -r '.requestId // empty')
expect_json "response contains requestId" '.requestId | length > 0'

send_request "$ALICE" "$BOB_ID"
expect "alice → bob again → 409 FRIENDSHIP_REQUEST_ALREADY_EXISTS" 409 FRIENDSHIP_REQUEST_ALREADY_EXISTS

send_request "$BOB" "$ALICE_ID"
expect "bob → alice while alice → bob is pending → 409 FRIENDSHIP_REQUEST_ALREADY_EXISTS" 409 FRIENDSHIP_REQUEST_ALREADY_EXISTS

section "GET /social/friends/request/pending"
pending_requests "$BOB"
expect "bob lists his pending requests → 200" 200
expect_json "bob sees the request received from alice" \
  "any(.requests[]; .id == \"$ALICE_TO_BOB\" and .senderId == \"$ALICE_ID\")"

pending_requests "$ALICE"
expect_json "alice does not see the request she sent" \
  "all(.requests[]; .id != \"$ALICE_TO_BOB\")"

section "POST /social/friends/request/:requestId/accept"
accept_request "$ALICE" "$ALICE_TO_BOB"
expect "sender accepts her own request → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

accept_request "$CAROL" "$ALICE_TO_BOB"
expect "another user accepts it → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

accept_request "$BOB" "$UNKNOWN_ID"
expect "unknown request → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

accept_request "$BOB" "$ALICE_TO_BOB"
expect "receiver accepts → 201" 201
expect_json "response contains friendshipId" '.friendshipId | length > 0'

accept_request "$BOB" "$ALICE_TO_BOB"
expect "accept twice → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

pending_requests "$BOB"
expect_json "accepted request is no longer pending" \
  "all(.requests[]; .id != \"$ALICE_TO_BOB\")"

send_request "$BOB" "$ALICE_ID"
expect "bob → alice once friends → 409 FRIENDSHIP_ALREADY_EXISTS" 409 FRIENDSHIP_ALREADY_EXISTS

section "DELETE /social/friends/request/:requestId/cancel"
send_request "$ALICE" "$CAROL_ID"
ALICE_TO_CAROL=$(echo "$BODY" | jq -r '.requestId // empty')

cancel_request "$CAROL" "$ALICE_TO_CAROL"
expect "receiver cancels → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

cancel_request "$ALICE" "$UNKNOWN_ID"
expect "unknown request → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

cancel_request "$ALICE" "$ALICE_TO_CAROL"
expect "sender cancels → 200" 200

pending_requests "$CAROL"
expect_json "cancelled request is no longer pending" \
  "all(.requests[]; .id != \"$ALICE_TO_CAROL\")"

send_request "$CAROL" "$ALICE_ID"
expect "carol → alice after cancellation → 201" 201
CAROL_TO_ALICE=$(echo "$BODY" | jq -r '.requestId // empty')

section "DELETE /social/friends/request/:requestId/reject"
request DELETE "/social/friends/request/$CAROL_TO_ALICE/reject"
expect "without token → 401" 401

reject_request "$CAROL" "$CAROL_TO_ALICE"
expect "sender rejects her own request → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

reject_request "$BOB" "$CAROL_TO_ALICE"
expect "another user rejects it → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

reject_request "$ALICE" "$UNKNOWN_ID"
expect "unknown request → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

reject_request "$ALICE" "$CAROL_TO_ALICE"
expect "receiver rejects → 200" 200

pending_requests "$ALICE"
expect_json "rejected request is no longer pending" \
  "all(.requests[]; .id != \"$CAROL_TO_ALICE\")"

accept_request "$ALICE" "$CAROL_TO_ALICE"
expect "rejected request cannot be accepted → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

reject_request "$ALICE" "$CAROL_TO_ALICE"
expect "reject twice → 404 FRIENDSHIP_REQUEST_NOT_FOUND" 404 FRIENDSHIP_REQUEST_NOT_FOUND

send_request "$CAROL" "$ALICE_ID"
expect "carol → alice after rejection → 201" 201

summary
