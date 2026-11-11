#!/usr/bin/env bash
# Manual end-to-end check of the errors raised before reaching the business logic:
# body validation codes, unknown fields, invalid JSON, too large body.
# Requires curl and jq.
#
# Usage: make test-e2e, or ./scripts/test-request-errors.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

# register_with JSON_BODY
register_with() {
  request POST /identity/register "" "$1"
}

preflight

section "Error shape"
register_with '{"username":"ab","email":"x","password":"weak"}'
expect "several invalid fields → 400 USERNAME_TOO_SHORT" 400 USERNAME_TOO_SHORT
expect_json "body has status, error and message" \
  '.status == 400 and (.message | type) == "string" and (keys | length) == 3'

section "Validation codes"
register_with "{\"username\":42,\"email\":\"x\",\"password\":\"weak\"}"
expect "username of the wrong type → 400 USERNAME_INVALID" 400 USERNAME_INVALID

register_with "{\"email\":\"user$SUFFIX@test.com\",\"password\":\"$PASSWORD\"}"
expect "missing username → 400 USERNAME_INVALID" 400 USERNAME_INVALID

register_with "{\"username\":\"user$SUFFIX\",\"email\":\"x\",\"password\":\"weak\"}"
expect "username fixed, invalid email → 400 EMAIL_INVALID" 400 EMAIL_INVALID

register_with "{\"username\":\"user$SUFFIX\",\"email\":\"user$SUFFIX@test.com\",\"password\":\"weak\"}"
expect "email fixed, weak password → 400 PASSWORD_TOO_WEAK" 400 PASSWORD_TOO_WEAK

request POST /identity/verify "" "{\"username\":\"user$SUFFIX\",\"otp_code\":\"12\"}"
expect "otp code of 2 digits → 400 OTP_CODE_INVALID" 400 OTP_CODE_INVALID

section "Request body"
register_with "{\"username\":\"user$SUFFIX\",\"email\":\"user$SUFFIX@test.com\",\"password\":\"$PASSWORD\",\"isAdmin\":true}"
expect "unknown field → 400 UNKNOWN_FIELD" 400 UNKNOWN_FIELD

register_with '{"username":'
expect "invalid JSON → 400 INVALID_JSON" 400 INVALID_JSON

LARGE_USERNAME=$(head -c 200000 /dev/zero | tr '\0' a)
register_with "{\"username\":\"$LARGE_USERNAME\"}"
expect "body over 100 kb → 413 PAYLOAD_TOO_LARGE" 413 PAYLOAD_TOO_LARGE

summary
