#!/usr/bin/env bash
set -euo pipefail

URL="${AI_NAVIGATION_UPSTREAM:-http://127.0.0.1:3001}"

curl -fsS "$URL/health"
echo
curl -fsS -X POST "$URL/api/navigation-search" \
  -H 'Content-Type: application/json' \
  -d '{"query":"войти","locale":"ru"}'
echo
curl -fsS -X POST "$URL/api/navigation-search" \
  -H 'Content-Type: application/json' \
  -d '{"query":"аккаунт","locale":"ru"}'
echo
curl -fsS -X POST "$URL/api/navigation-search" \
  -H 'Content-Type: application/json' \
  -d '{"query":"абсолютно непонятный запрос без смысла","locale":"ru"}'
echo
