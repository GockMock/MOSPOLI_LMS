# Техническое задание

## Изолированный AI-сервис семантической навигации и поиска для MOSPOLI_LMS

### 1. Контекст проекта

`MOSPOLI_LMS` — веб-приложение LMS на `Vue 3 + Vite + TypeScript`.

Текущее состояние проекта:

- frontend-приложение уже содержит базовые страницы авторизации:
  - `/` — вход;
  - `/register` — регистрация;
- основной функционал LMS ещё может развиваться отдельно;
- AI-поиск не должен быть жёстко встроен в frontend-код;
- архитектура должна быть максимально изолированной, чтобы AI-компонент можно было запускать отдельно, аналогично отдельному Docker-контейнеру.

---

## 2. Цель

Разработать изолированный сервис семантической навигации и поиска для LMS, который принимает пользовательский запрос на русском языке и возвращает одно из решений:

1. `redirect` — если найден один уверенный раздел LMS;
2. `suggest` — если найдено несколько подходящих разделов;
3. `fallback` — если система не смогла определить подходящий раздел.

Сервис должен использовать локальную embedding-модель через `llama.cpp` и предоставлять HTTP API, к которому основной LMS обращается как к внешнему сервису.

---

## 3. Главный принцип архитектуры

AI-поиск должен быть вынесен в отдельный сервис и не должен зависеть от внутренней реализации frontend-приложения.

Основное приложение LMS:

- показывает UI;
- отправляет поисковый запрос в AI-сервис;
- получает готовое решение;
- выполняет переход или показывает подсказки.

AI-сервис:

- хранит поисковые карточки разделов LMS;
- строит embedding-индекс;
- обращается к `llama.cpp` embedding endpoint;
- выполняет exact / keyword / vector / hybrid search;
- возвращает результат в едином JSON-формате.

---

## 4. Общая схема

```text
MOSPOLI_LMS frontend
        |
        | POST /api/navigation-search
        v
AI Navigation Search Service
        |
        | POST /embedding
        v
llama.cpp embedding server
```

Рекомендуемая схема запуска:

```text
docker compose
├── lms-frontend              # основной Vue/Vite LMS, опционально
├── ai-navigation-service     # API поиска и логика hybrid search
└── llama-embedding-server    # llama.cpp server с embedding-моделью
```

На первом этапе допускается запускать только:

```text
ai-navigation-service + llama-embedding-server
```

без контейнеризации самого frontend.

---

## 5. Что именно ищем в LMS

Сервис предназначен не для поиска по произвольному HTML, а для навигации по известным разделам LMS.

Примеры будущих разделов LMS:

- вход в систему;
- регистрация;
- личный кабинет;
- dashboard;
- мои курсы;
- каталог курсов;
- задания;
- тесты;
- расписание;
- оценки;
- прогресс обучения;
- уведомления;
- профиль пользователя;
- настройки аккаунта;
- помощь;
- восстановление пароля;
- администрирование пользователей;
- управление курсами.

Фактический список разделов должен храниться в конфигурационном файле AI-сервиса и обновляться по мере развития LMS.

---

## 6. Search Card

Каждый раздел LMS описывается отдельной поисковой карточкой.

Пример:

```json
{
  "id": "login",
  "url": "/",
  "title": "Вход в систему",
  "breadcrumbs": "Авторизация > Вход",
  "description": "Страница входа пользователя в MOSPOLI_LMS по email и паролю.",
  "aliases": [
    "войти",
    "авторизация",
    "логин",
    "страница входа",
    "зайти в систему"
  ],
  "keywords": [
    "email",
    "пароль",
    "аккаунт",
    "вход",
    "login"
  ],
  "priority": 1,
  "is_active": true
}
```

Пример для регистрации:

```json
{
  "id": "register",
  "url": "/register",
  "title": "Регистрация",
  "breadcrumbs": "Авторизация > Регистрация",
  "description": "Создание нового аккаунта пользователя MOSPOLI_LMS.",
  "aliases": [
    "зарегистрироваться",
    "создать аккаунт",
    "новый пользователь",
    "регистрация студента"
  ],
  "keywords": [
    "имя",
    "email",
    "пароль",
    "аккаунт",
    "register"
  ],
  "priority": 1,
  "is_active": true
}
```

---

## 7. Текст для embedding

В embedding-модель нельзя отправлять сырой HTML или Vue-компоненты.

Для каждой карточки формируется нормализованный текст:

```text
Раздел: Вход в систему
URL: /
Описание: Страница входа пользователя в MOSPOLI_LMS по email и паролю.
Подходит для запросов: войти, авторизация, логин, страница входа, зайти в систему.
Хлебные крошки: Авторизация > Вход.
Ключевые слова: email, пароль, аккаунт, вход, login.
```

---

## 8. Компоненты AI-сервиса

### 8.1. Navigation Search API

HTTP API, принимающее поисковые запросы от LMS.

Основной endpoint:

```http
POST /api/navigation-search
```

Назначение:

- нормализовать запрос;
- проверить exact/alias match;
- выполнить keyword search;
- выполнить vector search;
- объединить результаты;
- принять решение `redirect`, `suggest` или `fallback`.

---

### 8.2. Search Index Builder

Компонент построения индекса.

Задачи:

- загрузить search cards из JSON/YAML-файла;
- отфильтровать `is_active: true`;
- сформировать embedding-текст;
- получить embedding через `llama.cpp`;
- сохранить локальный индекс.

На первом этапе индекс может храниться локально в файлах внутри контейнера.

Допустимые варианты хранения:

- JSON-файл с embedding-векторами;
- SQLite;
- FAISS;
- Qdrant.

Для MVP рекомендуется простой вариант:

```text
JSON cards + JSON embeddings + cosine similarity in service memory
```

Это упростит запуск и позволит позже заменить хранилище на FAISS/Qdrant без изменения API.

---

### 8.3. llama.cpp embedding server

Отдельный процесс или контейнер с `llama.cpp`, поднятый в режиме embeddings.

Требования:

- запуск отдельно от LMS;
- HTTP endpoint для получения embedding;
- CPU-first режим;
- возможность позже включить GPU без изменения API LMS.

Пример логической конфигурации:

```text
model: Qwen3-Embedding-4B GGUF Q4/Q5
host: llama-embedding-server
port: 8080
endpoint: /embedding или OpenAI-compatible /v1/embeddings
```

Фактическая команда запуска зависит от выбранной сборки `llama.cpp` и формата модели.

---

## 9. Модель embedding

Базовый вариант:

```text
Qwen3-Embedding-4B GGUF Q4/Q5
```

Опциональный вариант при достаточных ресурсах:

```text
Qwen3-Embedding-8B GGUF Q4
```

Требования:

- поддержка русского языка;
- работа преимущественно на CPU;
- стабильный HTTP endpoint;
- возможность замены модели через переменные окружения.

Reranker в первой версии не нужен.

---

## 10. Алгоритм поиска

### 10.1. Нормализация запроса

Перед поиском запрос приводится к нормальной форме:

- trim;
- lowercase;
- удаление лишних пробелов;
- опционально: замена `ё` на `е`;
- ограничение длины запроса.

Пример:

```text
"  Как Войти в ЛМС? " -> "как войти в лмс"
```

---

### 10.2. Exact / alias match

Перед vector search сервис проверяет точные совпадения по:

- `title`;
- `aliases`;
- `keywords`;
- `url`;
- `id`.

Если найдено уверенное совпадение, сервис может сразу вернуть `redirect`.

Примеры:

```text
"войти" -> /
"регистрация" -> /register
"создать аккаунт" -> /register
```

---

### 10.3. Keyword search

Keyword search нужен для точных терминов LMS.

Поиск выполняется по полям:

- `title`;
- `aliases`;
- `keywords`;
- `description`;
- `breadcrumbs`.

Для MVP допускается простой scoring по совпадению токенов.

В дальнейшем можно заменить на BM25.

---

### 10.4. Vector search

Vector search используется для семантических запросов.

Примеры:

```text
"где посмотреть мои предметы" -> /courses
"хочу узнать баллы" -> /grades
"как попасть в аккаунт" -> /
```

Требования:

```json
{
  "top_k": 20,
  "metric": "cosine_similarity"
}
```

---

### 10.5. Hybrid scoring

Результаты keyword search и vector search объединяются.

Начальная формула:

```text
final_score = vector_score * 0.7 + keyword_score * 0.3 + priority_boost
```

Конфигурация:

```json
{
  "vector_weight": 0.7,
  "keyword_weight": 0.3,
  "priority_weight": 0.05
}
```

`priority_boost` используется для важных системных разделов, например входа, регистрации, личного кабинета.

---

## 11. Логика решений

### 11.1. Redirect

Сервис возвращает `redirect`, если найден один уверенный результат.

Условия для MVP:

```text
exact_alias_match = true
```

или

```text
top1_score >= 0.82
и
top1_score - top2_score >= 0.08
```

Пример ответа:

```json
{
  "action": "redirect",
  "query": "как войти в систему",
  "target": {
    "title": "Вход в систему",
    "url": "/",
    "score": 0.91
  }
}
```

---

### 11.2. Suggestions

Сервис возвращает `suggest`, если есть релевантные результаты, но уверенности для redirect недостаточно.

Условие:

```text
top1_score >= 0.62
```

Пример ответа:

```json
{
  "action": "suggest",
  "query": "аккаунт",
  "suggestions": [
    {
      "title": "Вход в систему",
      "url": "/",
      "score": 0.76
    },
    {
      "title": "Регистрация",
      "url": "/register",
      "score": 0.72
    }
  ]
}
```

---

### 11.3. Fallback

Сервис возвращает `fallback`, если подходящих разделов нет.

Пример ответа:

```json
{
  "action": "fallback",
  "query": "непонятный запрос",
  "message": "Не удалось точно определить раздел LMS. Попробуйте уточнить запрос."
}
```

---

## 12. API контракты

### 12.1. Navigation search

```http
POST /api/navigation-search
Content-Type: application/json
```

Request:

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

Response `redirect`:

```json
{
  "action": "redirect",
  "query": "как войти в лмс",
  "target": {
    "id": "login",
    "title": "Вход в систему",
    "url": "/",
    "score": 0.91
  }
}
```

Response `suggest`:

```json
{
  "action": "suggest",
  "query": "аккаунт",
  "suggestions": [
    {
      "id": "login",
      "title": "Вход в систему",
      "url": "/",
      "score": 0.76
    },
    {
      "id": "register",
      "title": "Регистрация",
      "url": "/register",
      "score": 0.72
    }
  ]
}
```

Response `fallback`:

```json
{
  "action": "fallback",
  "query": "что-то непонятное",
  "message": "Не удалось точно определить раздел LMS. Попробуйте уточнить запрос."
}
```

---

## 13. Изоляция от LMS

AI-сервис не должен импортировать frontend-код LMS.

Запрещено:

- напрямую читать Vue-компоненты как источник истины;
- завязываться на структуру `src/views`;
- хранить бизнес-логику LMS внутри frontend;
- делать embedding из HTML или `.vue` файлов.

Разрешено:

- хранить карточки разделов в отдельном файле;
- обновлять карточки вручную или отдельным build-скриптом;
- обращаться к AI-сервису только через HTTP API;
- менять модель/индекс без изменения frontend.

---

## 14. Рекомендуемая структура файлов

Изолированная структура может быть такой:

```text
MOSPOLI_LMS/
├── src/                         # существующий frontend
├── ai-navigation-service/        # отдельный сервис поиска
│   ├── package.json
│   ├── src/
│   │   ├── server.ts
│   │   ├── config.ts
│   │   ├── searchCards.ts
│   │   ├── embeddingClient.ts
│   │   ├── indexBuilder.ts
│   │   ├── keywordSearch.ts
│   │   ├── vectorSearch.ts
│   │   └── decision.ts
│   ├── data/
│   │   ├── cards.ru.json
│   │   └── embeddings.json
│   ├── Dockerfile
│   └── README.md
├── docker-compose.ai.yml
└── tz.md
```

Важно: это рекомендуемая структура, а не обязательное требование к текущему этапу.

---

## 15. Docker Compose

Нужно предусмотреть отдельный compose-файл для AI-инфраструктуры:

```yaml
services:
  ai-navigation-service:
    build: ./ai-navigation-service
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      EMBEDDING_BASE_URL: http://llama-embedding-server:8080
      EMBEDDING_MODEL: qwen3-embedding
    depends_on:
      - llama-embedding-server

  llama-embedding-server:
    image: local/llama-cpp-embedding:latest
    ports:
      - "8080:8080"
    volumes:
      - ./models:/models
    command: >
      --model /models/qwen3-embedding.gguf
      --embedding
      --host 0.0.0.0
      --port 8080
```

Итоговая команда запуска:

```bash
docker compose -f docker-compose.ai.yml up --build
```

Фактический Docker image для `llama.cpp` должен быть выбран отдельно при реализации.

---

## 16. Интеграция с frontend

Frontend должен использовать AI-сервис как внешний API.

Пример логики:

```ts
const response = await fetch('http://localhost:3001/api/navigation-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    locale: 'ru',
    user_context: {
      current_route: router.currentRoute.value.path
    }
  })
})

const result = await response.json()

if (result.action === 'redirect') {
  router.push(result.target.url)
}

if (result.action === 'suggest') {
  showSuggestions(result.suggestions)
}

if (result.action === 'fallback') {
  showFallback(result.message)
}
```

На первом этапе UI поиска можно не реализовывать, если задача ограничена подготовкой AI-сервиса.

---

## 17. Конфигурация

Все параметры должны задаваться через переменные окружения или конфиг:

```env
PORT=3001
EMBEDDING_BASE_URL=http://localhost:8080
EMBEDDING_MODEL=qwen3-embedding
VECTOR_WEIGHT=0.7
KEYWORD_WEIGHT=0.3
PRIORITY_WEIGHT=0.05
T_REDIRECT=0.82
T_GAP=0.08
T_SUGGEST=0.62
SUGGESTIONS_COUNT=5
```

---

## 18. MVP

В MVP необходимо реализовать:

1. отдельный `ai-navigation-service`;
2. endpoint `POST /api/navigation-search`;
3. файл `cards.ru.json` с первыми карточками LMS;
4. exact / alias match;
5. keyword scoring;
6. embedding client для `llama.cpp`;
7. vector search по локальному embedding-индексу;
8. hybrid scoring;
9. решения `redirect`, `suggest`, `fallback`;
10. `Dockerfile` для AI-сервиса;
11. `docker-compose.ai.yml` для запуска AI-сервиса и embedding-сервера.

---

## 19. Что не входит в MVP

В MVP не входит:

- полноценный чат-бот;
- генерация ответов LLM;
- RAG по учебным материалам;
- поиск по PDF/лекциям;
- reranker;
- админ-панель управления карточками;
- автоматическое сканирование Vue-компонентов;
- авторизация внутри AI-сервиса;
- хранение персональных данных пользователей;
- изменение текущих экранов входа и регистрации.

---

## 20. Безопасность и данные

В AI-сервис нельзя отправлять:

- пароль пользователя;
- access/refresh tokens;
- персональные данные без необходимости;
- содержимое учебных работ;
- приватные сообщения.

В запросе достаточно передавать:

- текст поискового запроса;
- текущий route;
- роль пользователя, если она нужна для фильтрации разделов.

---

## 21. Критерии готовности

Система считается готовой для MVP, если:

1. AI-сервис запускается отдельно от LMS;
2. endpoint `POST /api/navigation-search` возвращает корректный JSON;
3. запрос `войти` возвращает `redirect` на `/`;
4. запрос `регистрация` возвращает `redirect` на `/register`;
5. неоднозначный запрос `аккаунт` возвращает `suggest`;
6. нерелевантный запрос возвращает `fallback`;
7. embedding-сервис можно заменить через конфигурацию;
8. LMS не зависит от реализации AI-сервиса напрямую;
9. Docker Compose поднимает AI-инфраструктуру одной командой.

---

## 22. Открытые вопросы для согласования

Перед реализацией нужно согласовать:

1. Нужно ли в MVP реализовывать только backend AI-сервиса или сразу добавить UI поиска во frontend?
2. Какой runtime выбрать для `ai-navigation-service`: Node.js/TypeScript или Python/FastAPI?
3. Какой вариант хранения индекса выбрать для MVP: JSON в памяти, SQLite, FAISS или Qdrant?
4. Какой Docker image использовать для `llama.cpp`?
5. Где будут храниться модели: внутри проекта, в отдельной папке `models/` или во внешнем volume?
6. Какие первые разделы LMS кроме `/` и `/register` нужно добавить в `cards.ru.json`?
7. Нужно ли учитывать роли пользователей: `guest`, `student`, `teacher`, `admin`?
8. Должен ли сервис поддерживать только русский язык или сразу `ru/en`?

---

## 23. Предлагаемые решения по умолчанию

Если отдельного решения не будет, предлагается принять следующие настройки:

```text
AI service runtime: Node.js + TypeScript
Index storage for MVP: JSON в памяти
Embedding backend: llama.cpp OpenAI-compatible embeddings endpoint
Model: Qwen3-Embedding-4B GGUF Q4/Q5
Frontend changes in MVP: минимальные или отсутствуют
Docker: отдельный docker-compose.ai.yml
Languages: ru only
Roles: guest/student/teacher/admin заложить в cards, но не усложнять MVP
```

