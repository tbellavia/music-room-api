#!/usr/bin/env bash
# Shared helpers for the manual end-to-end test scripts.
# Source it after setting API: . "$(dirname "$0")/lib.sh"

set -u

SUFFIX=$RANDOM
PASSWORD='Password123!x'

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

# expect_json DESCRIPTION JQ_FILTER -> passes if the filter is true on BODY
expect_json() {
  if echo "$BODY" | jq -e "$2" >/dev/null 2>&1; then
    pass "$1"
  else
    fail "$1" "$BODY"
  fi
}

section() {
  printf "\n${BOLD}%s${RESET}\n" "$1"
}

# register USERNAME -> prints the account id
register() {
  local username=$1
  local account_id

  request POST /identity/register "" \
    "{\"username\":\"$username\",\"email\":\"$username@test.com\",\"password\":\"$PASSWORD\"}"
  account_id=$(echo "$BODY" | jq -r '.id // empty')
  if [ -z "$account_id" ]; then
    echo "Cannot register $username (HTTP $STATUS): $BODY" >&2
    exit 1
  fi
  echo "$account_id"
}

# login USERNAME -> prints the access token
login() {
  local username=$1
  local token

  request POST /identity/login "" \
    "{\"username\":\"$username\",\"password\":\"$PASSWORD\"}"
  token=$(echo "$BODY" | jq -r '.access_token // empty')
  if [ -z "$token" ]; then
    echo "Cannot log in $username (HTTP $STATUS): $BODY" >&2
    exit 1
  fi
  echo "$token"
}

# Checks the tools and that the API answers
preflight() {
  local command

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
}

# Prints the result and exits with 1 if a check failed
summary() {
  printf "\n${BOLD}%d passed, %d failed${RESET}\n" "$PASSED" "$FAILED"
  [ "$FAILED" -eq 0 ]
}
