import { readFile } from 'node:fs/promises'
import type { SearchCard } from './types.js'

export async function loadCards(path: string): Promise<SearchCard[]> {
  const raw = await readFile(path, 'utf8')
  const cards = JSON.parse(raw) as SearchCard[]
  return cards.filter((card) => card.is_active)
}

export function buildEmbeddingText(card: SearchCard): string {
  return [
    `Раздел: ${card.title}`,
    `URL: ${card.url}`,
    `Описание: ${card.description}`,
    `Подходит для запросов: ${card.aliases.join(', ')}.`,
    `Хлебные крошки: ${card.breadcrumbs}.`,
    `Ключевые слова: ${card.keywords.join(', ')}.`,
  ].join('\n')
}
