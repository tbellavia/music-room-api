#!/usr/bin/env bash
# Manual end-to-end check of the Google sign-in.
# Requires curl, jq and docker.
# Run through `make test-e2e`: in E2E mode the API accepts fake Google tokens
# `e2e:<google id>:<email>`, since a script cannot get a real one.
#
# Usage: make test-e2e, or ./scripts/test-google-sign-in.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# google_sign_in ID_TOKEN
google_sign_in() {
  request POST /identity/google "" "{\"id_token\":\"$1\"}"
}

# e2e_token GOOGLE_ID EMAIL -> a token the API accepts in E2E mode
e2e_token() {
  echo "e2e:$1:$2"
}

# token_claim CLAIM -> reads a claim of the access token in BODY
token_claim() {
  local payload
  payload=$(echo "$BODY" | jq -r '.access_token' | cut -d. -f2 | tr '_-' '/+')
  # base64 needs a length multiple of 4
  while [ $((${#payload} % 4)) -ne 0 ]; do
    payload="$payload="
  done
  echo "$payload" | base64 -d 2>/dev/null | jq -r ".$1"
}

preflight

section "First sign-in"
ALICE_EMAIL="googlealice$SUFFIX@gmail.com"
ALICE_TOKEN=$(e2e_token "alice-sub-$SUFFIX" "$ALICE_EMAIL")

google_sign_in "$ALICE_TOKEN"
expect "first sign-in creates the account → 200" 200
expect_json "returns an access token" '.access_token | type == "string"'
ALICE_ID=$(token_claim sub)
ALICE_USERNAME=$(token_claim username)
if [ "$ALICE_USERNAME" = "googlealice$SUFFIX" ]; then
  pass "username generated from the email"
else
  fail "username generated from the email" "got $ALICE_USERNAME"
fi
ACCESS_TOKEN=$(echo "$BODY" | jq -r '.access_token')

request GET /identity/profile "$ACCESS_TOKEN"
expect "the access token opens a protected route → 200" 200

section "Next sign-in"
google_sign_in "$ALICE_TOKEN"
expect "second sign-in → 200" 200
SECOND_ID=$(token_claim sub)
if [ "$SECOND_ID" = "$ALICE_ID" ]; then
  pass "same account as the first sign-in"
else
  fail "same account as the first sign-in" "first: $ALICE_ID, second: $SECOND_ID"
fi

google_sign_in "$(e2e_token "alice-sub-$SUFFIX" "alice.new$SUFFIX@gmail.com")"
CHANGED_EMAIL_ID=$(token_claim sub)
if [ "$CHANGED_EMAIL_ID" = "$ALICE_ID" ]; then
  pass "same account after a change of google email"
else
  fail "same account after a change of google email" "got $CHANGED_EMAIL_ID"
fi

section "Password login of a google account"
request POST /identity/login "" \
  "{\"username\":\"$ALICE_USERNAME\",\"password\":\"$PASSWORD\"}"
expect "google account with a password → 401 INVALID_CREDENTIALS" 401 INVALID_CREDENTIALS

section "Conflicts with local accounts"
BOB="gbob$SUFFIX"
register "$BOB" >/dev/null || exit 1

google_sign_in "$(e2e_token "bob-sub-$SUFFIX" "$BOB@test.com")"
expect "email of a local account → 409 EMAIL_ALREADY_EXISTS" 409 EMAIL_ALREADY_EXISTS

google_sign_in "$(e2e_token "other-bob-sub-$SUFFIX" "$BOB@gmail.com")"
expect "username of a local account → 200" 200
OTHER_BOB_USERNAME=$(token_claim username)
if [[ "$OTHER_BOB_USERNAME" =~ ^$BOB[0-9]{4}$ ]]; then
  pass "suffix added to the taken username"
else
  fail "suffix added to the taken username" "got $OTHER_BOB_USERNAME"
fi

section "Errors"
google_sign_in "forged-token"
expect "invalid google token → 401 INVALID_GOOGLE_TOKEN" 401 INVALID_GOOGLE_TOKEN

request POST /identity/google "" '{}'
expect "missing id_token → 400 ID_TOKEN_INVALID" 400 ID_TOKEN_INVALID

google_sign_in ""
expect "empty id_token → 400 ID_TOKEN_INVALID" 400 ID_TOKEN_INVALID

summary
