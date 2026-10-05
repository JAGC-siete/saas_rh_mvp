/**
 * Entradas de sitemap para landings públicas indexables (/p/[slug]).
 * Usa el cliente anon: RLS + GRANT ya limitan a filas published y columnas públicas.
 */

import { logger } from '../logger'
import { LANDING_PAGES_TABLE } from './db'
import { landingPublicPath } from './paths'
import { createPublicLandingClient } from './public-client'
import { readLandingPageContent } from './page-schema'

export interface LandingSitemapEntry {
  loc: string
  lastmod?: string
}

function lastmodDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const day = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

export async function listPublishedLandingSitemapEntries(): Promise<LandingSitemapEntry[]> {
  try {
    const supabase = createPublicLandingClient()
    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .select('slug, published_at, published_content_json')
      .eq('status', 'published')

    if (error) {
      logger.error('No se pudieron listar landings para el sitemap', { error: error.message })
      return []
    }

    if (!data?.length) return []

    const entries: LandingSitemapEntry[] = []

    for (const row of data) {
      const slug = typeof row.slug === 'string' ? row.slug.trim().toLowerCase() : ''
      if (!slug) continue

      const read = readLandingPageContent(row.published_content_json)
      if (!read.ok || read.content.meta.noindex) continue
      if (read.content.blocks.length === 0) continue

      entries.push({
        loc: landingPublicPath(slug),
        lastmod: lastmodDate(row.published_at as string | null),
      })
    }

    return entries
  } catch (err: unknown) {
    logger.error('Fallo al armar entradas de landings en el sitemap', {
      error: err instanceof Error ? err.message : 'Unknown',
    })
    return []
  }
}
