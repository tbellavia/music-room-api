#!/usr/bin/env bash
# Manual end-to-end check of the account verification.
# Requires curl, jq and docker.
# Run through `make test-e2e`: the API must be in E2E mode to read the codes.
#
# Usage: make test-e2e, or ./scripts/test-account-verification.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# verify USERNAME CODE
verify() {
  request POST /identity/verify "" \
    "{\"username\":\"$1\",\"otp_code\":\"$2\"}"
}

preflight

section "Setup"
ALICE="alice$SUFFIX"
request POST /identity/register "" \
  "{\"username\":\"$ALICE\",\"email\":\"$ALICE@test.com\",\"password\":\"$PASSWORD\"}"
ALICE_ID=$(echo "$BODY" | jq -r '.id // empty')
if ! ALICE_CODE=$(verification_code "$ALICE_ID"); then
  echo "Cannot read the verification code of $ALICE: run the scripts with make test-e2e" >&2
  exit 1
fi
echo "  alice=$ALICE_ID"

section "POST /identity/verify"
verify "$ALICE" "000000"
expect "wrong code → 401 INVALID_OTP" 401 INVALID_OTP

verify "$ALICE" "$ALICE_CODE"
expect "right code → 201" 201
expect_json "returns an access token" '.access_token | type == "string"'
ACCESS_TOKEN=$(echo "$BODY" | jq -r '.access_token')

request GET /identity/profile "$ACCESS_TOKEN"
expect "the token opens a protected route, without login → 200" 200

verify "$ALICE" "$ALICE_CODE"
expect "verify twice → 409 ACCOUNT_ALREADY_ACTIVE" 409 ACCOUNT_ALREADY_ACTIVE

summary
