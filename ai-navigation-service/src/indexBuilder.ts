import type { SearchCard } from './types.js'
import { buildEmbeddingText } from './cards.js'
import { createEmbedding } from './embeddingClient.js'

export interface IndexedCard {
  card: SearchCard
  embedding: number[]
  embeddingText: string
}

export async function buildIndex(cards: SearchCard[]): Promise<IndexedCard[]> {
  const indexedCards: IndexedCard[] = []

  for (const card of cards) {
    const embeddingText = buildEmbeddingText(card)
    const embedding = await createEmbedding(embeddingText)
    indexedCards.push({ card, embedding, embeddingText })
  }

  return indexedCards
}
