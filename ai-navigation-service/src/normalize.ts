export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[?!.,:;"'«»()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}
