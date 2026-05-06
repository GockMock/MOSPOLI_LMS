# Vast.ai Deploy

Recommended Vast mode: one Vast container running two processes inside it:

```text
llama.cpp server :8080
ai-navigation-service :3001
```

Expose only `3001` publicly when possible. `8080` can stay internal.

## Build image locally or in CI

From repo root:

```bash
docker build -f deploy/vast/Dockerfile -t mospoli-ai-navigation-vast:latest .
```

Push it to your registry, then use that image in a Vast template.

## Vast template/env

Recommended env:

```env
PORT=3001
MODEL_DIR=/workspace/models
MODEL_FILE=qwen3-embedding-4b-q5_k_m.gguf
DOWNLOAD_MODEL=true
EMBEDDING_MODEL=qwen3-embedding-q5-k-m
EMBEDDING_MOCK=false
ALLOW_EMBEDDING_FALLBACK=false
```

Open port:

```text
3001/tcp
```

After deploy, the AI upstream for the LMS proxy is:

```env
AI_NAVIGATION_UPSTREAM=http://<VAST_HOST_OR_IP>:3001
```

Frontend should still call same-origin `/api/navigation-search`; nginx on the LMS server proxies to this upstream.

## Health check

```bash
curl http://<VAST_HOST_OR_IP>:3001/health
curl -X POST http://<VAST_HOST_OR_IP>:3001/api/navigation-search \
  -H 'Content-Type: application/json' \
  -d '{"query":"регистрация","locale":"ru"}'
```
