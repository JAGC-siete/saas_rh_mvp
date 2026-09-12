export function parseEnterpriseAnnualPrice(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 0) return n
  return fallback
}

export async function loadEnterpriseAnnualPriceFromCatalog(
  supabase: { from: (table: string) => any },
  fallback: number
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('plan_catalog')
      .select('annual_price')
      .eq('plan_key', 'enterprise')
      .maybeSingle()
    if (error) return fallback
    return parseEnterpriseAnnualPrice(
      (data as { annual_price?: unknown } | null)?.annual_price,
      fallback
    )
  } catch {
    return fallback
  }
}
