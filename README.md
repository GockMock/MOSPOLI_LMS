#  MOSPOLI_LMS

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

## Portable AI Navigation Stack

This project includes an isolated AI navigation-search stack described in `goal.md` and `tz.md`.

Main files:

```text
ai-navigation-service/      # standalone HTTP API for navigation search
docker-compose.ai.yml       # AI service + llama.cpp embedding server
docker-compose.ai.mock.yml  # AI service only, mock embeddings for local API tests
qemu/                       # portable QEMU VM scripts and docs
models/                     # local GGUF model folder, ignored by git
```

Required model for the real embedding stack:

```text
models/qwen3-embedding-4b-q5_k_m.gguf
```

Run local API mock mode without Docker/llama.cpp:

```powershell
cd ai-navigation-service
npm install
npm run build
$env:EMBEDDING_MOCK="true"; npm start
```

Test:

```powershell
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/navigation-search -H "Content-Type: application/json" -d '{"query":"войти","locale":"ru"}'
```

Run real AI stack inside the QEMU Linux VM after Docker and the model are available:

```bash
docker compose -f docker-compose.ai.yml up --build
```

See `qemu/README.md` for VM startup, SSH, Docker installation, model placement, and limitations.

## Same-origin AI proxy

The frontend now calls the AI API through same-origin `/api` by default:

```text
fetch('/api/navigation-search')
```

Local Vite development proxies `/api` to:

```env
AI_NAVIGATION_UPSTREAM=http://localhost:3001
```

Production should proxy the LMS domain to the AI VM/Vast service, for example:

```text
https://lms.example.com/api/navigation-search
  -> http://AI_VM_OR_VAST_IP:3001/api/navigation-search
```

See `deploy/nginx/mospoli-lms-ai-proxy.conf`.

## AI Autodeploy

Deployment automation is provided for two targets:

```text
deploy/vast/   # Vast.ai single-container deployment
deploy/vm/     # normal Ubuntu VM/VPS with Docker Compose
```

Vast.ai recommended mode is one Vast container with two processes inside:

```text
llama.cpp :8080
ai-navigation-service :3001
```

Generic VM mode uses the existing two-container compose:

```text
ai-navigation-service
llama-embedding-server
```

Both modes produce or imply the same upstream value for the LMS server proxy:

```env
AI_NAVIGATION_UPSTREAM=http://AI_HOST:3001
VITE_AI_NAVIGATION_URL=
```

The browser should keep using same-origin `/api/navigation-search`.
