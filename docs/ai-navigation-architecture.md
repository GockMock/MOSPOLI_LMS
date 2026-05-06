# AI-навигация MOSPOLI LMS: инфраструктура и алгоритм

Этот файл показывает всю текущую схему крупными блоками: где живёт сайт, где живёт AI-инфраструктура, как проходит поисковый запрос и какие фильтры участвуют в принятии решения.

## 1. Общая инфраструктура

```mermaid
flowchart TB
    user[Пользователь в браузере]
    frontend[Vue frontend MOSPOLI LMS]
    proxy[Прокси сайта: nginx или Vite dev proxy]

    user --> frontend
    frontend --> proxy

    proxy --> api

    subgraph site[Основной сервер сайта]
        frontend
        proxy
    end

    subgraph ai[AI-инфраструктура: QEMU, VM, VPS или Vast.ai]
        api[AI Navigation Service]
        cards[Карточки разделов cards.ru.json]
        index[In-memory индекс]
        llama[llama.cpp embedding server]
        model[Qwen3 Embedding 4B GGUF Q5_K_M]

        api --> cards
        api --> index
        api --> llama
        llama --> model
    end

    subgraph deploy[Варианты запуска AI]
        qemu[Локально: portable QEMU]
        vm[Обычная VM: Docker Compose]
        vast[Vast.ai: один контейнер, два процесса]
    end

    qemu --> ai
    vm --> ai
    vast --> ai
```

Главная идея: основной сайт и AI могут жить на разных серверах. Браузер обращается только к своему сайту по `/api/navigation-search`, а сервер сайта проксирует запрос на AI-сервис через переменную `AI_NAVIGATION_UPSTREAM`.

## 2. Как проходит запрос от пользователя до результата

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant UI as Vue NavigationSearch
    participant P as Прокси сайта
    participant API as AI Navigation Service
    participant L as llama.cpp
    participant R as Vue Router

    U->>UI: Вводит текст в поиск
    UI->>UI: debounce и состояние loading
    UI->>P: POST /api/navigation-search
    P->>API: Передаёт запрос в AI upstream

    API->>API: Нормализация запроса
    API->>API: Проверка exact match и aliases

    alt Есть точное совпадение
        API-->>UI: action redirect
        UI->>R: router.push(url)
    else Нужно искать семантически
        API->>L: Получить embedding запроса
        L-->>API: Вектор запроса
        API->>API: Keyword scoring
        API->>API: Vector cosine similarity
        API->>API: Hybrid scoring с priority boost
        API->>API: Проверка thresholds

        alt Высокая уверенность
            API-->>UI: action redirect
            UI->>R: router.push(url)
        else Есть похожие разделы
            API-->>UI: action suggest
            UI-->>U: Плавно показывает suggestions
        else Ничего подходящего
            API-->>UI: action fallback
            UI-->>U: Показывает fallback сообщение
        end
    end
```

Frontend не знает про `llama.cpp`, модель, Docker, QEMU или Vast.ai. Для него существует только один API endpoint.

## 3. Алгоритм поиска, модели и фильтры

```mermaid
flowchart TD
    cards[cards.ru.json]
    active[Фильтр активных карточек]
    text[Текст карточки для embedding]
    cardEmb[Embedding карточек]
    memory[In-memory vector index]

    cards --> active
    active --> text
    text --> cardEmb
    cardEmb --> memory

    query[Запрос пользователя]
    normalize[Нормализация]
    exact[Exact и alias фильтр]
    keyword[Keyword scoring]
    queryEmb[Embedding запроса]
    vector[Vector search]
    hybrid[Hybrid score]
    decision[Decision logic]

    query --> normalize
    normalize --> exact
    exact --> exactHit{Точное совпадение?}
    exactHit -->|да| redirect1[redirect]
    exactHit -->|нет| keyword
    exactHit -->|нет| queryEmb

    queryEmb --> vector
    memory --> vector
    keyword --> hybrid
    vector --> hybrid
    active --> priority[Priority boost]
    priority --> hybrid

    hybrid --> decision
    decision --> redirect2[redirect]
    decision --> suggest[suggestions]
    decision --> fallback[fallback]

    subgraph model[Модель]
        llama[llama.cpp]
        qwen[Qwen3 Embedding 4B Q5_K_M]
        llama --> qwen
    end

    text --> llama
    queryEmb --> llama
```

В поиске участвуют только подготовленные карточки разделов LMS. Сырой HTML, Vue-компоненты, пароли, токены и личные данные в embedding-модель не отправляются.

Основные фильтры и оценки такие:

```text
Exact match: id, url, title, aliases
Keyword score: title, breadcrumbs, description, aliases, keywords
Vector score: cosine similarity между embedding запроса и embedding карточки
Priority boost: небольшой бонус важным разделам
```

Формула MVP:

```text
final_score = vector_score * 0.7 + keyword_score * 0.3 + priority_boost
```

Пороги MVP:

```text
redirect: top1_score >= 0.82 и gap >= 0.08
suggest:  top1_score >= 0.62
fallback: если score ниже suggest-порога
```

Сейчас в MVP нет чат-бота, генерации ответов и reranker. Используется только embedding-модель для семантической навигации по разделам LMS.
