---
name: mospoli-lms-ai
description: Use when working on this MOSPOLI_LMS repository, especially the portable QEMU Docker AI navigation stack, llama.cpp Q5_K_M embeddings, ai-navigation-service, docker-compose.ai.yml, or the Vue search UI.
---

# MOSPOLI_LMS AI Navigation Stack

## Current architecture

This repo has a portable AI navigation-search stack:

```text
Vue frontend on Windows host
  -> http://localhost:3001
  -> QEMU Linux VM
  -> Docker Compose
  -> ai-navigation-service
  -> llama.cpp embedding server
  -> Qwen3-Embedding-4B GGUF Q5_K_M
```

Do not assume Docker Desktop is installed on Windows. Docker is intended to run inside the portable QEMU VM.

## Important files

- `goal.md` — implemented goal and success criteria.
- `tz.md` — architecture/spec adapted to MOSPOLI_LMS.
- `ai-navigation-service/` — standalone Node/TypeScript HTTP API.
- `ai-navigation-service/data/cards.ru.json` — search cards; update this when adding LMS sections.
- `docker-compose.ai.yml` — real AI stack with llama.cpp and Q5_K_M model.
- `docker-compose.ai.mock.yml` — mock embeddings for fast API checks without llama.cpp.
- `qemu/start-vm.ps1` — starts portable VM; default CPU is `qemu64` with WHPX.
- `qemu/stop-vm.ps1` — safe VM shutdown helper.
- `qemu/README.md` and `qemu/ARTIFACTS.md` — operational notes and artifact manifest.
- `models/qwen3-embedding-4b-q5_k_m.gguf` — local model artifact, ignored by git.
- `src/components/NavigationSearch.vue` — frontend search UI.
- `.env.example` — frontend API base URL example.

## Ports and access

- Frontend dev server: `http://localhost:5173`
- AI navigation API: `http://localhost:3001`
- llama.cpp server: `http://localhost:8080`
- VM SSH: `ssh -i qemu/ssh/mospli_ai -p 2222 mospli@localhost`

## Verified behavior

Required real-stack checks previously passed with `embedding_mock=false`:

- `GET /health` -> `status: ok`, `cards: 8`
- query `войти` -> `redirect /`
- query `регистрация` -> `redirect /register`
- query `аккаунт` -> `suggest`
- query `абсолютно непонятный запрос без смысла` -> `fallback`

## Common commands

Start VM:

```powershell
.\qemu\start-vm.ps1
```

Stop VM:

```powershell
.\qemu\stop-vm.ps1
```

Check containers inside VM:

```powershell
ssh -i qemu\ssh\mospli_ai -p 2222 mospli@localhost "cd ~/MOSPOLI_LMS && sudo docker compose -f docker-compose.ai.yml ps"
```

Run frontend:

```powershell
npm run dev -- --host 127.0.0.1
```

Run local builds:

```powershell
npm run build
cd ai-navigation-service
npm run build
```

Run API smoke test against whichever stack is on `localhost:3001`:

```powershell
node ai-navigation-service\scripts\test-api.mjs
```

## Safety rules

- Never commit model files, VM images, QEMU binaries, Docker runtime data, logs, or private SSH keys.
- Keep `models/README.md`, `qemu/*.ps1`, `qemu/scripts/`, `qemu/cloud-init/`, `qemu/README.md`, and `qemu/ARTIFACTS.md` as source artifacts.
- If real semantic scores look wrong, first check `docker-compose.ai.yml`; the llama.cpp server should use the model default pooling. Do not re-add `--pooling cls`.
- If WHPX fails with `-cpu max`, use the current `qemu64` default.
- Frontend should call same-origin `/api/navigation-search` by default. Use `AI_NAVIGATION_UPSTREAM` for Vite/nginx proxy targets. It should not know about Docker, QEMU, llama.cpp, or embeddings internals.

- Production proxy example: deploy/nginx/mospoli-lms-ai-proxy.conf.


## Deploy automation

- `deploy/vast/` is for Vast.ai. Prefer one Vast container running `llama.cpp` and `ai-navigation-service` as two processes. Use `deploy/vast/Dockerfile` and `deploy/vast/start.sh`.
- `deploy/vm/` is for a normal Ubuntu VM/VPS. Use `install-docker.sh`, then `deploy-ai-compose.sh`.
- Both deployment modes should expose/emit `AI_NAVIGATION_UPSTREAM=http://AI_HOST:3001` for the LMS nginx proxy. Keep `VITE_AI_NAVIGATION_URL=` empty for same-origin browser calls.
