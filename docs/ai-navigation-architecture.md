# MOSPOLI LMS AI Navigation: Infrastructure and Search Algorithm

This document describes the current AI navigation-search infrastructure, deployment variants, involved models, filters, scoring stages, and frontend integration.

## 1. High-level production architecture

```mermaid
flowchart LR
    U[User in Browser] --> F[MOSPOLI LMS Frontend]
    F -->|same-origin fetch('/api/navigation-search')| N[LMS Web Server / Nginx]
    N -->|proxy_pass| A[AI Navigation Service :3001]
    A -->|HTTP embeddings request| L[llama.cpp Embedding Server :8080]
    L --> M[(Qwen3-Embedding-4B GGUF Q5_K_M)]

    subgraph LMS_Server[Main LMS server]
        F
        N
    end

    subgraph AI_Runtime[AI infrastructure: VM / Vast.ai / QEMU]
        A
        L
        M
    end

    A --> C[(cards.ru.json)]
    A --> I[(in-memory vector index)]
```

The browser does not know where the AI infrastructure is deployed. It calls only the LMS domain. The LMS server proxies `/api/navigation-search` to the AI upstream.

## 2. Local portable QEMU architecture

```mermaid
flowchart TB
    B[Windows host] -->|http://localhost:5173| Vite[Vite dev server]
    B -->|http://localhost:3001| PF3001[QEMU port forward 3001]
    B -->|ssh -p 2222| PF2222[QEMU port forward 2222]

    subgraph Repo[MOSPOLI_LMS repository]
        QEMU[qemu/bin/qemu-system-x86_64.exe]
        Disk[(qemu/images/mospli-ai.qcow2)]
        Model[(models/qwen3-embedding-4b-q5_k_m.gguf)]
        Compose[docker-compose.ai.yml]
    end

    QEMU --> VM[Ubuntu Linux VM]
    Disk --> VM
    PF2222 --> VM
    PF3001 --> VM

    subgraph VM[Portable Ubuntu VM]
        Docker[Docker Engine + Compose]
        Docker --> AIS[ai-navigation-service container]
        Docker --> LLAMA[llama.cpp server container]
        LLAMA --> ModelMount[/models mount/]
    end

    AIS -->|http://llama-embedding-server:8080/v1/embeddings| LLAMA
    Model --> ModelMount
```

Local QEMU is useful for development and demonstrations without Docker Desktop on Windows. Docker runs inside the VM.

## 3. Vast.ai deployment architecture

```mermaid
flowchart TB
    LMS[LMS server / Nginx] -->|AI_NAVIGATION_UPSTREAM=http://vast-host:3001| Vast[Vast.ai instance container]

    subgraph Vast[Vast.ai single container]
        Start[deploy/vast/start.sh]
        Start --> LlamaProc[llama.cpp process :8080]
        Start --> NodeProc[ai-navigation-service process :3001]
        LlamaProc --> VastModel[(Qwen3-Embedding-4B Q5_K_M in /workspace/models)]
        NodeProc -->|localhost:8080| LlamaProc
    end

    Browser[Browser] -->|/api/navigation-search| LMS
```

Vast.ai instances are already containerized, so the recommended Vast mode is one image with two processes instead of Docker-in-Docker.

## 4. Normal VM deployment architecture

```mermaid
flowchart TB
    Admin[Deploy script] --> Install[deploy/vm/install-docker.sh]
    Admin --> Deploy[deploy/vm/deploy-ai-compose.sh]

    Install --> Docker[Docker Engine + Compose]
    Deploy --> Compose[docker-compose.ai.yml]

    Compose --> AIS[ai-navigation-service container :3001]
    Compose --> LLAMA[llama.cpp embedding container :8080]
    LLAMA --> Model[(models/qwen3-embedding-4b-q5_k_m.gguf)]
    AIS --> LLAMA

    Deploy --> Env[ai-navigation-upstream.env]
    Env -->|AI_NAVIGATION_UPSTREAM=http://AI_HOST:3001| LMSProxy[LMS Nginx proxy]
```

This is the recommended mode for an ordinary VPS or private VM where Docker can run normally.

## 5. Frontend request flow

```mermaid
sequenceDiagram
    participant User
    participant Vue as Vue NavigationSearch.vue
    participant Nginx as LMS Nginx / Vite proxy
    participant API as AI Navigation Service
    participant Llama as llama.cpp embeddings

    User->>Vue: Types query after login
    Vue->>Vue: Debounce input
    Vue->>Nginx: POST /api/navigation-search
    Nginx->>API: Proxy request
    API->>API: Normalize query
    API->>API: Check exact aliases
    alt exact match
        API-->>Nginx: action=redirect
    else semantic search needed
        API->>Llama: POST /v1/embeddings
        Llama-->>API: query embedding
        API->>API: keyword scoring
        API->>API: vector scoring
        API->>API: hybrid scoring
        API->>API: decision thresholds
        API-->>Nginx: redirect / suggest / fallback
    end
    Nginx-->>Vue: JSON result
    alt redirect
        Vue->>Vue: router.push(target.url)
    else suggest
        Vue->>User: Show smooth suggestions panel
    else fallback
        Vue->>User: Show fallback message
    end
```

## 6. Search pipeline and filters

```mermaid
flowchart TD
    Q[Raw user query] --> N[Normalize query]
    N --> N1[trim]
    N --> N2[lowercase]
    N --> N3[replace ё with е]
    N --> N4[remove punctuation]
    N --> N5[collapse spaces]
    N --> N6[max query length]

    N --> Empty{Empty query?}
    Empty -->|yes| FB0[fallback: ask to enter query]
    Empty -->|no| Exact[Exact / alias match]

    Exact --> EFields[Compare normalized query with card id, url, title, aliases]
    EFields --> ExactHit{Exact hit?}
    ExactHit -->|yes| RedirectExact[redirect, score=1]
    ExactHit -->|no| Emb[Create query embedding]

    Emb --> Vector[Vector search over in-memory card embeddings]
    N --> Keyword[Keyword scoring]

    Keyword --> KFields[title, breadcrumbs, description, aliases, keywords]
    Keyword --> KScore[matched query tokens / query tokens]
    Vector --> VScore[cosine similarity]

    KScore --> Hybrid[Hybrid score]
    VScore --> Hybrid
    Hybrid --> Formula[final_score = vector*0.7 + keyword*0.3 + priority_boost]

    Formula --> Sort[Sort candidates by final_score desc]
    Sort --> Decision{Decision}

    Decision -->|top1 >= 0.82 and gap >= 0.08| Redirect[redirect]
    Decision -->|top1 >= 0.62| Suggest[suggest top 5]
    Decision -->|otherwise| Fallback[fallback]
```

## 7. Index build flow

```mermaid
flowchart TD
    Cards[ai-navigation-service/data/cards.ru.json] --> ActiveFilter[Filter is_active=true]
    ActiveFilter --> CardText[Build embedding text per card]

    CardText --> TextTemplate[Section, URL, description, aliases, breadcrumbs, keywords]
    TextTemplate --> Llama[llama.cpp /v1/embeddings]
    Llama --> Embeddings[Normalized embedding vectors]
    Embeddings --> MemoryIndex[(In-memory index)]

    ActiveFilter --> ExactMap[Exact lookup values]
    ActiveFilter --> KeywordCorpus[Keyword searchable text]

    ExactMap --> Runtime[Runtime search]
    KeywordCorpus --> Runtime
    MemoryIndex --> Runtime
```

The service does not embed Vue components, HTML, passwords, tokens, or private user data. Only curated search cards are embedded.

## 8. Data model for a search card

```mermaid
classDiagram
    class SearchCard {
        string id
        string url
        string title
        string breadcrumbs
        string description
        string[] aliases
        string[] keywords
        number priority
        boolean is_active
        string[] roles
    }

    class IndexedCard {
        SearchCard card
        number[] embedding
        string embeddingText
    }

    SearchCard --> IndexedCard
```

Current initial cards are login, register, dashboard, courses, assignments, grades, profile, and help.

## 9. Models and runtime components

```mermaid
flowchart LR
    subgraph Models
        M1[Qwen3-Embedding-4B GGUF Q5_K_M]
    end

    subgraph Runtime
        L[llama.cpp server]
        A[ai-navigation-service Node.js]
    end

    subgraph SearchLogic
        F1[Exact alias filter]
        F2[Keyword token filter]
        F3[Vector cosine similarity]
        F4[Priority boost]
        F5[Threshold decision]
    end

    M1 --> L
    L --> F3
    A --> F1
    A --> F2
    A --> F3
    A --> F4
    A --> F5
```

There is no reranker in the MVP. There is no generative chat model. The embedding model is used only for semantic navigation search.

## 10. Scoring and thresholds

```mermaid
flowchart TD
    Scores[Candidate scores] --> VectorWeight[vector_score * 0.7]
    Scores --> KeywordWeight[keyword_score * 0.3]
    Scores --> Priority[priority * 0.05]

    VectorWeight --> Final[final_score]
    KeywordWeight --> Final
    Priority --> Final

    Final --> Top[Top candidates]
    Top --> RedirectRule{top1 >= 0.82 and top1-top2 >= 0.08?}
    RedirectRule -->|yes| R[redirect]
    RedirectRule -->|no| SuggestRule{top1 >= 0.62?}
    SuggestRule -->|yes| S[suggest]
    SuggestRule -->|no| F[fallback]
```

Default values are configurable through environment variables:

```env
VECTOR_WEIGHT=0.7
KEYWORD_WEIGHT=0.3
PRIORITY_WEIGHT=0.05
T_REDIRECT=0.82
T_GAP=0.08
T_SUGGEST=0.62
SUGGESTIONS_COUNT=5
```

## 11. Auth-related UI behavior

```mermaid
stateDiagram-v2
    [*] --> Guest
    Guest --> Authenticated: login() in mock auth state
    Authenticated --> Guest: logout()

    Guest: Search bar hidden
    Authenticated: Search bar visible
    Authenticated: NavigationSearch can query /api/navigation-search
```

Current authentication is only a frontend mock using `localStorage`. Real auth/backend integration is not implemented yet.

## 12. Deployment output and proxy variable

```mermaid
flowchart LR
    Deploy[AI autodeploy: Vast or VM] --> Upstream[AI_NAVIGATION_UPSTREAM=http://AI_HOST:3001]
    Upstream --> LMSNginx[LMS nginx config]
    LMSNginx --> BrowserAPI[Browser uses /api/navigation-search]

    Direct[VITE_AI_NAVIGATION_URL] -. normally empty .-> BrowserAPI
```

The preferred production setup keeps `VITE_AI_NAVIGATION_URL` empty and uses same-origin proxying. This avoids CORS and lets the AI host change without rebuilding the frontend.
