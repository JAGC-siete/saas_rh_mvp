/**
 * Prefer Railway private networking URL to avoid egress charges.
 * @see https://docs.railway.com/guides/optimize-usage
 */
export function getRedisUrl(): string | undefined {
  const url =
    process.env.REDIS_PRIVATE_URL?.trim() ||
    process.env.REDIS_URL?.trim() ||
    undefined
  return url || undefined
}

export function isRedisConfigured(): boolean {
  return Boolean(getRedisUrl())
}
