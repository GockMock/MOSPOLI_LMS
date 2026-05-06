#!/usr/bin/env bash
set -euo pipefail

cd "${1:-$HOME/MOSPOLI_LMS}"
docker compose -f docker-compose.ai.yml up --build
