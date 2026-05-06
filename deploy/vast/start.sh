#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/app/ai-navigation-service}"
MODEL_DIR="${MODEL_DIR:-/workspace/models}"
MODEL_FILE="${MODEL_FILE:-qwen3-embedding-4b-q5_k_m.gguf}"
MODEL_PATH="${MODEL_PATH:-$MODEL_DIR/$MODEL_FILE}"
MODEL_URL="${MODEL_URL:-https://huggingface.co/Qwen/Qwen3-Embedding-4B-GGUF/resolve/main/Qwen3-Embedding-4B-Q5_K_M.gguf?download=true}"
DOWNLOAD_MODEL="${DOWNLOAD_MODEL:-true}"
LLAMA_SERVER_BIN="${LLAMA_SERVER_BIN:-/app/llama-server}"
LLAMA_HOST="${LLAMA_HOST:-0.0.0.0}"
LLAMA_PORT="${LLAMA_PORT:-8080}"
PORT="${PORT:-3001}"

mkdir -p "$MODEL_DIR"

if [[ ! -f "$MODEL_PATH" ]]; then
  if [[ "$DOWNLOAD_MODEL" != "true" ]]; then
    echo "Model is missing and DOWNLOAD_MODEL=false: $MODEL_PATH" >&2
    exit 1
  fi
  echo "Downloading embedding model to $MODEL_PATH"
  curl -L --fail --retry 5 --retry-delay 5 -C - -o "$MODEL_PATH" "$MODEL_URL"
fi

if [[ ! -x "$LLAMA_SERVER_BIN" ]]; then
  echo "llama-server binary not found or not executable: $LLAMA_SERVER_BIN" >&2
  exit 1
fi

echo "Starting llama.cpp embedding server on :$LLAMA_PORT"
"$LLAMA_SERVER_BIN" \
  -m "$MODEL_PATH" \
  --embedding \
  -ub "${LLAMA_UBATCH:-8192}" \
  --host "$LLAMA_HOST" \
  --port "$LLAMA_PORT" &
LLAMA_PID=$!

cleanup() {
  kill "$LLAMA_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Waiting for llama.cpp on http://127.0.0.1:$LLAMA_PORT"
for _ in $(seq 1 120); do
  if curl -fsS "http://127.0.0.1:$LLAMA_PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

cd "$APP_DIR"
export PORT
export EMBEDDING_BASE_URL="${EMBEDDING_BASE_URL:-http://127.0.0.1:$LLAMA_PORT}"
export EMBEDDING_MODEL="${EMBEDDING_MODEL:-qwen3-embedding-q5-k-m}"
export EMBEDDING_MOCK="${EMBEDDING_MOCK:-false}"
export ALLOW_EMBEDDING_FALLBACK="${ALLOW_EMBEDDING_FALLBACK:-false}"
export VECTOR_WEIGHT="${VECTOR_WEIGHT:-0.7}"
export KEYWORD_WEIGHT="${KEYWORD_WEIGHT:-0.3}"
export PRIORITY_WEIGHT="${PRIORITY_WEIGHT:-0.05}"
export T_REDIRECT="${T_REDIRECT:-0.82}"
export T_GAP="${T_GAP:-0.08}"
export T_SUGGEST="${T_SUGGEST:-0.62}"
export SUGGESTIONS_COUNT="${SUGGESTIONS_COUNT:-5}"

echo "Starting ai-navigation-service on :$PORT"
exec node dist/server.js
