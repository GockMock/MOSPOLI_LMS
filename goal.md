# Goal: Portable AI Navigation Infrastructure for MOSPOLI_LMS

## Objective

Set up and verify a fully isolated, portable AI navigation-search infrastructure for `MOSPOLI_LMS` using a QEMU-based Linux virtual machine stored inside the project directory, Docker inside that VM, `llama.cpp` embeddings, and a standalone AI navigation service.

The implementation must not require Docker Desktop on the host system and must keep the AI stack isolated from the existing Vue LMS frontend.

---

## Required Architecture

```text
Windows host
  |
  | SSH / forwarded ports
  v
Portable QEMU Linux VM
  |
  | Docker Compose
  v
Containers:
  - ai-navigation-service
  - llama.cpp embedding server
```

The AI service must be accessible from the Windows host through a forwarded local port.

---

## Model Requirement

Use a GGUF embedding model with quantization:

```text
Q5_K_M
```

Preferred model family:

```text
Qwen3-Embedding-4B GGUF Q5_K_M
```

If the exact model artifact name differs, document the selected file clearly and keep the architecture model-configurable.

---

## Portable QEMU VM Requirements

Create a portable VM workspace under the project, for example:

```text
MOSPOLI_LMS/
└── qemu/
    ├── images/
    ├── shared/
    ├── scripts/
    ├── ssh/
    ├── start-vm.ps1
    ├── stop-vm.ps1
    └── README.md
```

The VM should:

1. run Linux;
2. support SSH access from the host;
3. expose required ports to the host;
4. use hardware acceleration where available;
5. keep Docker data inside the VM disk;
6. mount or otherwise access the project/shared folder;
7. be restartable using project-local scripts.

Preferred acceleration on Windows:

```text
WHPX
```

If WHPX is unavailable, document the fallback mode.

---

## Docker Requirements Inside VM

Install and verify inside the QEMU VM:

1. Docker Engine;
2. Docker Compose plugin;
3. basic container networking;
4. volume access for models and service files.

Verification commands should include:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

---

## AI Navigation Service Requirements

Implement a standalone service, isolated from the Vue frontend.

Recommended location:

```text
ai-navigation-service/
```

The service must provide:

```http
POST /api/navigation-search
```

Request example:

```json
{
  "query": "как войти в лмс",
  "locale": "ru",
  "user_context": {
    "current_route": "/",
    "role": "guest"
  }
}
```

Response actions:

1. `redirect`;
2. `suggest`;
3. `fallback`.

---

## Search Logic Requirements

Implement the MVP search pipeline:

```text
query normalization
-> exact / alias match
-> keyword scoring
-> embedding request to llama.cpp
-> vector search
-> hybrid scoring
-> decision: redirect / suggest / fallback
```

Required decision thresholds:

```env
T_REDIRECT=0.82
T_GAP=0.08
T_SUGGEST=0.62
```

Required hybrid weights:

```env
VECTOR_WEIGHT=0.7
KEYWORD_WEIGHT=0.3
PRIORITY_WEIGHT=0.05
```

---

## Search Cards

Create initial LMS navigation cards for at least:

1. login page `/`;
2. registration page `/register`;
3. future dashboard route `/dashboard`;
4. courses section `/courses`;
5. assignments section `/assignments`;
6. grades section `/grades`;
7. profile section `/profile`;
8. help section `/help`.

The cards must be stored outside frontend Vue components, for example:

```text
ai-navigation-service/data/cards.ru.json
```

Do not use raw `.vue` files or HTML as embedding source.

---

## llama.cpp Embedding Server Requirements

Run `llama.cpp` as a separate container or service inside the VM.

It must expose an HTTP embeddings endpoint compatible with the AI service.

Preferred logical configuration:

```env
EMBEDDING_BASE_URL=http://llama-embedding-server:8080
EMBEDDING_MODEL=qwen3-embedding-q5-k-m
```

The model file should be stored outside the container, for example:

```text
models/qwen3-embedding-4b-q5_k_m.gguf
```

---

## Docker Compose Requirements

Add a dedicated compose file for AI infrastructure:

```text
docker-compose.ai.yml
```

It should start:

1. `ai-navigation-service`;
2. `llama-embedding-server`.

The compose setup must allow:

```bash
docker compose -f docker-compose.ai.yml up --build
```

from inside the VM/project workspace.

---

## Host Access Requirements

From Windows host, the AI API should be testable through a forwarded port, for example:

```bash
curl http://localhost:3001/health
```

and:

```bash
curl -X POST http://localhost:3001/api/navigation-search \
  -H "Content-Type: application/json" \
  -d '{"query":"войти","locale":"ru"}'
```

---

## Required Verification Scenarios

After implementation, verify these scenarios end to end:

### 1. Health check

```http
GET /health
```

Expected: service is alive.

### 2. Login redirect

Query:

```text
войти
```

Expected:

```json
{
  "action": "redirect",
  "target": {
    "url": "/"
  }
}
```

### 3. Register redirect

Query:

```text
регистрация
```

Expected:

```json
{
  "action": "redirect",
  "target": {
    "url": "/register"
  }
}
```

### 4. Ambiguous account query

Query:

```text
аккаунт
```

Expected:

```json
{
  "action": "suggest"
}
```

Suggestions should include login/register/profile-related routes when relevant.

### 5. Fallback query

Query:

```text
абсолютно непонятный запрос без смысла
```

Expected:

```json
{
  "action": "fallback"
}
```

---

## Documentation Requirements

Document:

1. how to start the QEMU VM;
2. how to SSH into it;
3. how to install/update Docker inside it;
4. where the model file must be placed;
5. how to start AI Docker Compose;
6. how to test API endpoints;
7. how to stop the VM safely;
8. known limitations, especially around GPU passthrough.

---

## Boundaries

Do not change the existing LMS frontend unless explicitly required later.

Do not implement:

- full chatbot;
- RAG over lectures/PDFs;
- answer generation;
- reranker;
- admin UI;
- automatic Vue route scanning;
- password/token forwarding to AI service.

Keep the first implementation focused on isolated semantic navigation search.

---

## Completion Criteria

This goal is complete only when:

1. `goal.md` and `tz.md` describe the agreed architecture;
2. portable QEMU VM scripts/configs are present;
3. Docker works inside the VM;
4. `ai-navigation-service` is implemented;
5. `llama.cpp` embedding server is configured for `Q5_K_M` model usage;
6. `docker-compose.ai.yml` starts the AI stack;
7. the AI API is reachable from the host;
8. all required redirect/suggest/fallback test scenarios are verified;
9. startup and testing instructions are documented.


---

## Frontend Search UI Requirement

Add a polished navigation-search UI to the existing Vue LMS frontend after the isolated AI service is ready.

The UI should be visually consistent with the current Material-style authentication screens and should not disrupt the existing login/register layout.

Recommended behavior:

1. show a compact search input for LMS navigation;
2. send the query to `ai-navigation-service` through HTTP;
3. debounce user input to avoid excessive API requests;
4. show loading state while search is running;
5. smoothly display suggestions when the API returns `suggest`;
6. automatically navigate with `router.push()` when the API returns `redirect`;
7. show a gentle fallback message when the API returns `fallback`;
8. handle API/network errors gracefully;
9. keep all llama.cpp, embeddings, Docker, and VM details hidden from the frontend.

Suggested UX:

```text
[ Найти раздел LMS... ]

Suggestions panel:
  - Вход в систему
  - Регистрация
  - Профиль
```

Animation requirements:

- suggestions should fade/slide in smoothly;
- suggestions should disappear smoothly when the query is cleared;
- loading state should not cause layout jumps;
- keyboard-friendly behavior is preferred if time allows.

Recommended frontend configuration:

```env
VITE_AI_NAVIGATION_URL=http://localhost:3001
```

Example frontend flow:

```text
User types query
  -> debounce
  -> POST /api/navigation-search
  -> redirect: router.push(target.url)
  -> suggest: render clickable suggestions
  -> fallback: show message
```

Frontend completion criteria:

1. search input is visible in the LMS UI;
2. suggestions appear smoothly;
3. clicking a suggestion navigates to its URL;
4. redirect responses navigate automatically;
5. fallback responses are shown clearly;
6. network/API errors do not break the page;
7. existing login/register functionality remains intact.
