#!/usr/bin/env bash
# Manual end-to-end check of the account listing.
# Requires curl and jq.
# Run through `make test-e2e`: the API must be in E2E mode to verify the accounts.
#
# Usage: make test-e2e, or ./scripts/test-list-accounts.sh [API_URL]

API="${1:-http://localhost:3000/api/v1}"
. "$(dirname "$0")/lib.sh"

preflight

section "Setup"
# All the usernames start with the same prefix, so that the other accounts of
# the database never match the searches below
PREFIX="q$SUFFIX"
ALICE_ID=$(register "${PREFIX}alice") || exit 1
BOB_ID=$(register "${PREFIX}bob") || exit 1
UNDERSCORE_ID=$(register "${PREFIX}_x") || exit 1
LETTER_ID=$(register "${PREFIX}ax") || exit 1
ALICE=$(login "${PREFIX}alice") || exit 1
request POST /identity/register "" \
  "{\"username\":\"${PREFIX}unverified\",\"email\":\"${PREFIX}unverified@test.com\",\"password\":\"$PASSWORD\"}"
echo "  accounts: ${PREFIX}alice, ${PREFIX}bob, ${PREFIX}_x, ${PREFIX}ax, ${PREFIX}unverified (not verified)"

section "GET /identity/accounts"
request GET /identity/accounts "$ALICE"
expect "list without prefix → 200" 200
expect_json "the caller is not listed" "all(.accounts[]; .id != \"$ALICE_ID\")"
expect_json "bob is listed" "any(.accounts[]; .id == \"$BOB_ID\" and .username == \"${PREFIX}bob\")"
expect_json "accounts only have id and username" "all(.accounts[]; keys == [\"id\", \"username\"])"

request GET "/identity/accounts?prefix=$PREFIX" "$ALICE"
expect "list with prefix → 200" 200
expect_json "only the matching accounts, without the caller nor the unverified one" \
  "[.accounts[].id] | sort == ([\"$BOB_ID\", \"$UNDERSCORE_ID\", \"$LETTER_ID\"] | sort)"
# Postgres sorts with the collation of the database (en_US: punctuation is
# ignored first), so only usernames made of letters and digits are compared
expect_json "sorted by username" \
  "[.accounts[] | select(.id == \"$LETTER_ID\" or .id == \"$BOB_ID\") | .id] == [\"$LETTER_ID\", \"$BOB_ID\"]"

request GET "/identity/accounts?prefix=Q${SUFFIX}B" "$ALICE"
expect_json "the prefix ignores the case" "[.accounts[].id] == [\"$BOB_ID\"]"

request GET "/identity/accounts?prefix=${PREFIX}_" "$ALICE"
expect_json "_ in the prefix is a plain character" "[.accounts[].id] == [\"$UNDERSCORE_ID\"]"

request GET "/identity/accounts?prefix=${PREFIX}%25" "$ALICE"
expect_json "% in the prefix is a plain character" ".accounts == []"

request GET "/identity/accounts?prefix=" "$ALICE"
expect "empty prefix → 200" 200
expect_json "empty prefix lists everybody but the caller" \
  "any(.accounts[]; .id == \"$BOB_ID\") and all(.accounts[]; .id != \"$ALICE_ID\")"

request GET "/identity/accounts?prefix=a&prefix=b" "$ALICE"
expect "prefix given twice → 400 PREFIX_INVALID" 400 PREFIX_INVALID

request GET "/identity/accounts?prefix=aaaaaaaaaaaaaaaaaaaaa" "$ALICE"
expect "prefix of 21 characters → 400 PREFIX_TOO_LONG" 400 PREFIX_TOO_LONG

request GET "/identity/accounts?prefix=aaaaaaaaaaaaaaaaaaaa" "$ALICE"
expect "prefix of 20 characters → 200" 200

request GET "/identity/accounts?unknown=1" "$ALICE"
expect "unknown query field → 400 UNKNOWN_FIELD" 400 UNKNOWN_FIELD

request GET /identity/accounts
expect "no token → 401 UNAUTHORIZED" 401 UNAUTHORIZED

summary
