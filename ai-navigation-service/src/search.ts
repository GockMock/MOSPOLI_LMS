import { config } from './config.js'
import { createEmbedding } from './embeddingClient.js'
import { normalizeText, tokenize } from './normalize.js'
import { cosineSimilarity } from './vector.js'
import type { Candidate, SearchCard, SearchResponse } from './types.js'
import type { IndexedCard } from './indexBuilder.js'

export async function navigationSearch(query: string, cards: SearchCard[], index: IndexedCard[]): Promise<SearchResponse> {
  const normalizedQuery = normalizeText(query).slice(0, config.maxQueryLength)

  if (!normalizedQuery) {
    return fallback(normalizedQuery, 'Введите поисковый запрос.')
  }

  const exactCard = findExactMatch(normalizedQuery, cards)
  if (exactCard) {
    return {
      action: 'redirect',
      query: normalizedQuery,
      target: toCandidate(exactCard, 1, 0, 1, true),
    }
  }

  const queryEmbedding = await createEmbedding(normalizedQuery)
  const candidates = index
    .map(({ card, embedding }) => {
      const keywordScore = scoreKeywords(normalizedQuery, card)
      const cosineScore = Math.max(0, cosineSimilarity(queryEmbedding, embedding))
      const vectorScore = isZeroVector(queryEmbedding) || isZeroVector(embedding) ? keywordScore : cosineScore
      const priorityBoost = Math.max(0, Math.min(1, card.priority)) * config.priorityWeight
      const score = vectorScore * config.vectorWeight + keywordScore * config.keywordWeight + priorityBoost
      return toCandidate(card, score, vectorScore, keywordScore, false, priorityBoost)
    })
    .sort((left, right) => right.score - left.score)

  const top1 = candidates[0]
  const top2 = candidates[1]

  if (!top1) {
    return fallback(normalizedQuery)
  }

  const gap = top2 ? top1.score - top2.score : top1.score
  if (top1.score >= config.redirectThreshold && gap >= config.gapThreshold) {
    return {
      action: 'redirect',
      query: normalizedQuery,
      target: top1,
    }
  }

  if (top1.score >= config.suggestThreshold) {
    return {
      action: 'suggest',
      query: normalizedQuery,
      suggestions: candidates.slice(0, config.suggestionsCount),
    }
  }

  return fallback(normalizedQuery)
}

function findExactMatch(normalizedQuery: string, cards: SearchCard[]): SearchCard | undefined {
  return cards.find((card) => {
    const exactValues = [card.id, card.url, card.title, ...card.aliases]
    return exactValues.some((value) => normalizeText(value) === normalizedQuery)
  })
}

function scoreKeywords(normalizedQuery: string, card: SearchCard): number {
  const queryTokens = tokenize(normalizedQuery)
  if (queryTokens.length === 0) return 0

  const strongValues = [card.title, ...card.aliases].map(normalizeText)
  if (strongValues.some((value) => value.includes(normalizedQuery) || normalizedQuery.includes(value))) {
    return 1
  }

  const searchableText = normalizeText([
    card.title,
    card.breadcrumbs,
    card.description,
    ...card.aliases,
    ...card.keywords,
  ].join(' '))
  const searchableTokens = new Set(tokenize(searchableText))
  const matched = queryTokens.filter((token) => searchableTokens.has(token)).length

  return Math.min(1, matched / queryTokens.length)
}

function toCandidate(
  card: SearchCard,
  score: number,
  vectorScore: number,
  keywordScore: number,
  exact = false,
  priorityBoost = Math.max(0, Math.min(1, card.priority)) * config.priorityWeight,
): Candidate {
  return {
    id: card.id,
    title: card.title,
    url: card.url,
    score: round(exact ? 1 : score),
    vector_score: round(vectorScore),
    keyword_score: round(keywordScore),
    priority_boost: round(priorityBoost),
  }
}

function fallback(query: string, message = 'Не удалось точно определить раздел LMS. Попробуйте уточнить запрос.'): SearchResponse {
  return { action: 'fallback', query, message }
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000
}

function isZeroVector(vector: number[]): boolean {
  return vector.every((value) => value === 0)
}
