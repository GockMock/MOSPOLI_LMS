#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$PWD}"
MODEL_DIR="${MODEL_DIR:-$REPO_DIR/models}"
MODEL_FILE="${MODEL_FILE:-qwen3-embedding-4b-q5_k_m.gguf}"
MODEL_PATH="$MODEL_DIR/$MODEL_FILE"
MODEL_URL="${MODEL_URL:-https://huggingface.co/Qwen/Qwen3-Embedding-4B-GGUF/resolve/main/Qwen3-Embedding-4B-Q5_K_M.gguf?download=true}"
DOWNLOAD_MODEL="${DOWNLOAD_MODEL:-true}"
AI_PUBLIC_HOST="${AI_PUBLIC_HOST:-}"
AI_PUBLIC_PORT="${AI_PUBLIC_PORT:-3001}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ai.yml}"

cd "$REPO_DIR"
mkdir -p "$MODEL_DIR"

if [[ ! -f "$MODEL_PATH" ]]; then
  if [[ "$DOWNLOAD_MODEL" != "true" ]]; then
    echo "Model is missing and DOWNLOAD_MODEL=false: $MODEL_PATH" >&2
    exit 1
  fi
  echo "Downloading model to $MODEL_PATH"
  curl -L --fail --retry 5 --retry-delay 5 -C - -o "$MODEL_PATH" "$MODEL_URL"
fi

docker compose -f "$COMPOSE_FILE" up --build -d

echo "Waiting for AI service..."
for _ in $(seq 1 120); do
  if curl -fsS "http://127.0.0.1:${AI_PUBLIC_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [[ -z "$AI_PUBLIC_HOST" ]]; then
  AI_PUBLIC_HOST="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
fi

cat > ai-navigation-upstream.env <<EOF
AI_NAVIGATION_UPSTREAM=http://${AI_PUBLIC_HOST}:${AI_PUBLIC_PORT}
VITE_AI_NAVIGATION_URL=
EOF

cat ai-navigation-upstream.env

docker compose -f "$COMPOSE_FILE" ps
