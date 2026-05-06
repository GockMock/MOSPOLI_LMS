import { fileURLToPath } from 'node:url'

export const config = {
  port: Number(process.env.PORT ?? 3001),
  embeddingBaseUrl: process.env.EMBEDDING_BASE_URL ?? 'http://localhost:8080',
  embeddingModel: process.env.EMBEDDING_MODEL ?? 'qwen3-embedding-q5-k-m',
  embeddingMock: process.env.EMBEDDING_MOCK === 'true',
  allowEmbeddingFallback: process.env.ALLOW_EMBEDDING_FALLBACK !== 'false',
  vectorWeight: Number(process.env.VECTOR_WEIGHT ?? 0.7),
  keywordWeight: Number(process.env.KEYWORD_WEIGHT ?? 0.3),
  priorityWeight: Number(process.env.PRIORITY_WEIGHT ?? 0.05),
  redirectThreshold: Number(process.env.T_REDIRECT ?? 0.82),
  gapThreshold: Number(process.env.T_GAP ?? 0.08),
  suggestThreshold: Number(process.env.T_SUGGEST ?? 0.62),
  suggestionsCount: Number(process.env.SUGGESTIONS_COUNT ?? 5),
  maxQueryLength: Number(process.env.MAX_QUERY_LENGTH ?? 180),
  cardsPath: process.env.CARDS_PATH ?? fileURLToPath(new URL('../data/cards.ru.json', import.meta.url)),
}
