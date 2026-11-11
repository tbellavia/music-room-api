#!/usr/bin/env bash
# Manual end-to-end check of the forgotten password flow.
# Requires curl, jq and docker.
# Run through `make test-e2e`: the API must be in E2E mode to read the codes.
#
# Usage: make test-e2e, or ./scripts/test-password-reset.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

NEW_PASSWORD='NewPassword456!y'
WRONG_CODE='000000'

# forgot_password EMAIL
forgot_password() {
  request POST /identity/password/forgot "" "{\"email\":\"$1\"}"
}

# reset_password EMAIL CODE NEW_PASSWORD
reset_password() {
  request POST /identity/password/reset "" \
    "{\"email\":\"$1\",\"otp_code\":\"$2\",\"new_password\":\"$3\"}"
}

# sign_in USERNAME PASSWORD
sign_in() {
  request POST /identity/login "" \
    "{\"username\":\"$1\",\"password\":\"$2\"}"
}

# reset_code_of ACCOUNT_ID -> prints the code, or exits if none was logged
reset_code_of() {
  local code
  if ! code=$(password_reset_code "$1"); then
    echo "Cannot read the password reset code of $1: run the scripts with make test-e2e" >&2
    exit 1
  fi
  echo "$code"
}

preflight

section "Setup"
ALICE="alice$SUFFIX"
ALICE_EMAIL="$ALICE@test.com"
ALICE_ID=$(register "$ALICE") || exit 1
BOB="bob$SUFFIX"
BOB_ID=$(register "$BOB") || exit 1
echo "  alice=$ALICE_ID bob=$BOB_ID"

section "Forgot password"
forgot_password "unknown$SUFFIX@test.com"
expect "unknown email → 202" 202
UNKNOWN_EMAIL_BODY=$BODY

forgot_password "$ALICE_EMAIL"
expect "existing email → 202" 202
if [ "$BODY" = "$UNKNOWN_EMAIL_BODY" ]; then
  pass "same body for an existing and an unknown email"
else
  fail "same body for an existing and an unknown email" "unknown: $UNKNOWN_EMAIL_BODY, existing: $BODY"
fi
ALICE_CODE=$(reset_code_of "$ALICE_ID") || exit 1

forgot_password "$ALICE_EMAIL"
expect "second request within 60 s → 202" 202
SECOND_CODE=$(reset_code_of "$ALICE_ID") || exit 1
if [ "$SECOND_CODE" = "$ALICE_CODE" ]; then
  pass "no new code within the cooldown"
else
  fail "no new code within the cooldown" "a new code was sent: $SECOND_CODE"
fi

forgot_password "not-an-email"
expect "invalid email → 400 EMAIL_INVALID" 400 EMAIL_INVALID

section "Reset password: errors"
reset_password "$ALICE_EMAIL" "$WRONG_CODE" "$NEW_PASSWORD"
expect "wrong code → 401 INVALID_OTP" 401 INVALID_OTP

reset_password "unknown$SUFFIX@test.com" "$ALICE_CODE" "$NEW_PASSWORD"
expect "unknown email → 401 INVALID_OTP" 401 INVALID_OTP

reset_password "$ALICE_EMAIL" "$ALICE_CODE" "weak"
expect "weak password → 400 NEW_PASSWORD_TOO_WEAK" 400 NEW_PASSWORD_TOO_WEAK

reset_password "$ALICE_EMAIL" "12" "$NEW_PASSWORD"
expect "code of 2 digits → 400 OTP_CODE_INVALID" 400 OTP_CODE_INVALID

section "Reset password"
reset_password "$ALICE_EMAIL" "$ALICE_CODE" "$NEW_PASSWORD"
expect "right code → 204" 204

sign_in "$ALICE" "$PASSWORD"
expect "old password → 401 INVALID_CREDENTIALS" 401 INVALID_CREDENTIALS

sign_in "$ALICE" "$NEW_PASSWORD"
expect "new password → 201" 201

reset_password "$ALICE_EMAIL" "$ALICE_CODE" "Other$NEW_PASSWORD"
expect "code used twice → 401 INVALID_OTP" 401 INVALID_OTP

if docker logs "$API_CONTAINER" 2>&1 | grep -q "E2E password changed account=$ALICE_ID"; then
  pass "password changed email sent"
else
  fail "password changed email sent" "no 'E2E password changed' line for $ALICE_ID"
fi

section "Too many attempts"
forgot_password "$BOB@test.com"
BOB_CODE=$(reset_code_of "$BOB_ID") || exit 1
for attempt in 1 2 3 4 5; do
  reset_password "$BOB@test.com" "$WRONG_CODE" "$NEW_PASSWORD"
done
expect "5th wrong code → 401 INVALID_OTP" 401 INVALID_OTP

reset_password "$BOB@test.com" "$BOB_CODE" "$NEW_PASSWORD"
expect "right code after 5 wrong ones → 429 TOO_MANY_OTP_ATTEMPTS" 429 TOO_MANY_OTP_ATTEMPTS

section "Unverified account"
CAROL="carol$SUFFIX"
request POST /identity/register "" \
  "{\"username\":\"$CAROL\",\"email\":\"$CAROL@test.com\",\"password\":\"$PASSWORD\"}"
CAROL_ID=$(echo "$BODY" | jq -r '.id // empty')

sign_in "$CAROL" "$PASSWORD"
expect "unverified account cannot sign in → 403 ACCOUNT_NOT_ACTIVE" 403 ACCOUNT_NOT_ACTIVE

forgot_password "$CAROL@test.com"
CAROL_CODE=$(reset_code_of "$CAROL_ID") || exit 1
reset_password "$CAROL@test.com" "$CAROL_CODE" "$NEW_PASSWORD"
expect "reset of an unverified account → 204" 204

sign_in "$CAROL" "$NEW_PASSWORD"
expect "the reset also verified the account → 201" 201

summary
