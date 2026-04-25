import type { PerfRating } from './schema'

export interface PerfScoreItem {
  weight: number
  rating?: PerfRating
}

export const DEFAULT_RATING_SCORE: Record<PerfRating, number> = {
  no_cumple: 0,
  cumple: 1,
  supera: 1.25
}

export function computeOverallScore(
  items: PerfScoreItem[],
  config?: { superaMultiplier?: number }
): number | null {
  const rated = items.filter((i) => i.rating)
  if (rated.length === 0) return null

  const superaMultiplier =
    typeof config?.superaMultiplier === 'number' && Number.isFinite(config.superaMultiplier)
      ? config.superaMultiplier
      : DEFAULT_RATING_SCORE.supera

  const ratingScore: Record<PerfRating, number> = {
    no_cumple: 0,
    cumple: 1,
    supera: superaMultiplier
  }

  const rawWeights = rated.map((i) => (Number.isFinite(i.weight) ? Math.max(0, i.weight) : 0))
  const sumWeights = rawWeights.reduce((a, b) => a + b, 0)

  const normalized = sumWeights > 0 ? rawWeights.map((w) => w / sumWeights) : rawWeights.map(() => 1 / rated.length)

  let score = 0
  for (let idx = 0; idx < rated.length; idx++) {
    const r = rated[idx].rating!
    score += normalized[idx] * ratingScore[r]
  }

  return Math.round(score * 1000) / 1000
}

