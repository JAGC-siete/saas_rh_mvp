export const DEFAULT_GODFATHER_KEYWORD = 'MI CONSTANCIA TARDA UNA ETERNIDAD'

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Detects the Godfather reply keyword with tolerance for accents and minor variation.
 */
export function matchesGodfatherKeyword(
  body: string,
  keyword: string = DEFAULT_GODFATHER_KEYWORD
): boolean {
  const normalizedBody = normalizeForMatch(body)
  const normalizedKeyword = normalizeForMatch(keyword)
  if (!normalizedKeyword) return false
  if (normalizedBody.includes(normalizedKeyword)) return true

  const tokens = normalizedKeyword.split(' ').filter(Boolean)
  if (tokens.length < 4) return normalizedBody.includes(normalizedKeyword)

  const core = tokens.slice(0, Math.min(5, tokens.length)).join(' ')
  return normalizedBody.includes(core)
}
