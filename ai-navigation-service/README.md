# AI Navigation Service

Standalone HTTP service for MOSPOLI_LMS semantic navigation search.

## Run locally in mock embedding mode

```bash
npm install
npm run build
$env:EMBEDDING_MOCK="true"; npm start
```

## Endpoints

```http
GET /health
POST /api/navigation-search
```

Example:

```bash
curl -X POST http://localhost:3001/api/navigation-search \
  -H "Content-Type: application/json" \
  -d '{"query":"войти","locale":"ru"}'
```

## Environment

```env
PORT=3001
EMBEDDING_BASE_URL=http://localhost:8080
EMBEDDING_MODEL=qwen3-embedding-q5-k-m
EMBEDDING_MOCK=false
ALLOW_EMBEDDING_FALLBACK=false
VECTOR_WEIGHT=0.7
KEYWORD_WEIGHT=0.3
PRIORITY_WEIGHT=0.05
T_REDIRECT=0.82
T_GAP=0.08
T_SUGGEST=0.62
SUGGESTIONS_COUNT=5
```

Use `EMBEDDING_MOCK=true` only for local API development and tests without llama.cpp.
