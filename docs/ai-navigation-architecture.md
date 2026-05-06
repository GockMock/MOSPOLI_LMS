# AI-навигация MOSPOLI LMS: инфраструктура и алгоритм

Документ коротко показывает, как сайт общается с AI-сервисом, где живёт модель, какие фильтры участвуют в поиске и как принимается решение: перейти сразу, показать подсказки или вернуть fallback.

## 1. Общая production-схема

```mermaid
flowchart LR
    user[Пользователь] --> site[Сайт MOSPOLI LMS]
    site --> proxy[Прокси сайта: /api/navigation-search]
    proxy --> api[AI Navigation Service]
    api --> llama[llama.cpp embeddings]
    llama --> model[Qwen3 Embedding 4B Q5_K_M]
    api --> cards[Карточки разделов cards.ru.json]
```

Главная идея простая: браузер не знает, где находится AI-сервер. Он отправляет запрос на свой же домен по адресу `/api/navigation-search`, а сервер сайта проксирует этот запрос на AI-инфраструктуру.

## 2. Локальная схема через portable QEMU

```mermaid
flowchart TB
    win[Windows host] --> vite[Vite сайт: localhost:5173]
    win --> qemu[Portable QEMU VM]
    qemu --> docker[Docker внутри VM]
    docker --> api[ai-navigation-service]
    docker --> llama[llama.cpp server]
    llama --> model[GGUF модель Q5_K_M]
    api --> llama
```

Такой вариант нужен для локального запуска без Docker Desktop. QEMU лежит в папке проекта, Docker установлен внутри Linux VM, а модель хранится в `models/`.

## 3. Схема для Vast.ai

```mermaid
flowchart TB
    site[Основной сайт] --> proxy[Прокси /api/navigation-search]
    proxy --> vast[Vast.ai instance]
    vast --> api[AI service process]
    vast --> llama[llama.cpp process]
    api --> llama
    llama --> model[Qwen3 Embedding 4B Q5_K_M]
```

Для Vast.ai лучше использовать один контейнер Vast, внутри которого запускаются два процесса: `llama.cpp` и `ai-navigation-service`. Так проще, чем Docker-in-Docker.

## 4. Схема для обычной VM или VPS

```mermaid
flowchart TB
    vm[Ubuntu VM или VPS] --> compose[Docker Compose]
    compose --> api[Контейнер ai-navigation-service]
    compose --> llama[Контейнер llama.cpp]
    api --> llama
    llama --> model[Модель Q5_K_M]
    deploy[deploy/vm/deploy-ai-compose.sh] --> compose
    deploy --> env[AI_NAVIGATION_UPSTREAM]
```

На обычной VM используется привычный вариант с двумя Docker-контейнерами. Скрипт деплоя поднимает compose и выводит переменную `AI_NAVIGATION_UPSTREAM`, которую нужно указать в nginx/proxy основного сайта.

## 5. Как проходит запрос пользователя

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant F as Frontend
    participant P as Прокси сайта
    participant A as AI service
    participant L as llama.cpp

    U->>F: Вводит запрос
    F->>F: debounce
    F->>P: POST /api/navigation-search
    P->>A: Передаёт запрос
    A->>A: Нормализация и exact match
    alt Найден точный alias
        A-->>F: redirect
    else Нужен семантический поиск
        A->>L: Запрос embedding
        L-->>A: Вектор запроса
        A->>A: Keyword + Vector + Hybrid scoring
        A-->>F: redirect или suggest или fallback
    end
```

Frontend не вызывает `llama.cpp` напрямую. Вся AI-логика скрыта за одним API.

## 6. Алгоритм поиска

```mermaid
flowchart TD
    q[Запрос пользователя] --> n[Нормализация]
    n --> exact[Проверка title, aliases, keywords, url]
    exact --> hit{Точное совпадение?}
    hit -->|да| redirect[redirect]
    hit -->|нет| emb[Embedding запроса]
    emb --> vector[Vector search]
    n --> keyword[Keyword scoring]
    vector --> hybrid[Hybrid score]
    keyword --> hybrid
    hybrid --> decision{Решение}
    decision -->|высокий score и gap| redirect
    decision -->|средний score| suggest[suggestions]
    decision -->|низкий score| fallback[fallback]
```

Сначала всегда проверяются простые точные совпадения. Это быстрее и надёжнее для запросов вроде `войти`, `регистрация`, `оценки`. Если точного совпадения нет, используется embedding-поиск.

## 7. Какие данные участвуют в поиске

```mermaid
flowchart LR
    card[Search Card] --> title[title]
    card --> aliases[aliases]
    card --> keywords[keywords]
    card --> desc[description]
    card --> crumbs[breadcrumbs]
    card --> url[url]
    card --> priority[priority]
```

В модель не отправляются Vue-компоненты, HTML, пароли, токены или личные данные. В embedding уходит только заранее подготовленное описание раздела из `cards.ru.json`.

## 8. Как строится индекс

```mermaid
flowchart TD
    cards[cards.ru.json] --> active[Фильтр is_active=true]
    active --> text[Текст для embedding]
    text --> llama[llama.cpp embeddings]
    llama --> index[Векторы в памяти сервиса]
    active --> exact[Справочник exact/alias]
    active --> keyword[Текст для keyword scoring]
```

Сейчас индекс хранится в памяти сервиса. Для MVP этого достаточно, потому что карточек разделов мало. Позже это можно заменить на Qdrant, FAISS, pgvector или SQLite без изменения frontend API.

## 9. Модель и компоненты

```mermaid
flowchart TB
    model[Qwen3 Embedding 4B GGUF Q5_K_M]
    llama[llama.cpp server]
    api[Node.js ai-navigation-service]
    ui[Vue NavigationSearch]

    model --> llama
    llama --> api
    api --> ui
```

В MVP нет чат-бота, генерации ответов и reranker. Используется только embedding-модель для поиска подходящего раздела LMS.

## 10. Фильтры и scoring

```mermaid
flowchart TD
    exact[Exact match] --> final[Итоговое решение]
    keyword[Keyword score] --> score[Hybrid score]
    vector[Vector score] --> score
    priority[Priority boost] --> score
    score --> final
```

Основные фильтры и оценки такие:

```text
Exact match: id, url, title, aliases
Keyword score: title, breadcrumbs, description, aliases, keywords
Vector score: cosine similarity по embeddings
Priority boost: небольшой бонус важным разделам
```

Формула:

```text
final_score = vector_score * 0.7 + keyword_score * 0.3 + priority_boost
```

Пороговые значения:

```text
redirect: score >= 0.82 и gap >= 0.08
suggest:  score >= 0.62
fallback: всё ниже suggest-порога
```

## 11. Поведение в интерфейсе

```mermaid
stateDiagram-v2
    [*] --> Guest
    Guest --> Authenticated: Вход
    Authenticated --> Guest: Выход
    Guest: Поиск скрыт
    Authenticated: Поиск показан
```

Сейчас авторизация временная и хранится во frontend через `localStorage`. До входа строка поиска скрыта. После входа она появляется.

## 12. Как сайт узнаёт адрес AI

```mermaid
flowchart LR
    deploy[Деплой AI] --> upstream[AI_NAVIGATION_UPSTREAM]
    upstream --> nginx[Nginx сайта]
    browser[Браузер] --> sameorigin[/api/navigation-search]
    sameorigin --> nginx
    nginx --> ai[AI service]
```

При деплое AI-инфраструктуры получается адрес вида:

```env
AI_NAVIGATION_UPSTREAM=http://AI_HOST:3001
```

Этот адрес нужен серверу сайта или nginx. В браузер его лучше не отдавать. Frontend продолжает ходить на относительный путь `/api/navigation-search`.
