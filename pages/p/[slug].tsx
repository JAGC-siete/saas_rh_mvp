/**
 * Render público de una landing publicada: /p/[slug].
 *
 * Sin sesión y sin chrome de marketing (el shell lo decide isPublicTenantLandingRoute
 * en lib/seo/public-ssr-routes.ts). Lee con el cliente anon: RLS solo expone filas
 * con status='published' y el GRANT por columna deja fuera el borrador.
 */

import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import LandingRenderer from '../../components/landings/LandingRenderer'
import SchemaMarkup from '../../components/SEO/SchemaMarkup'
import { LANDING_PAGE_PUBLIC_COLUMNS, LANDING_PAGES_TABLE, toPublicLandingPage } from '../../lib/landings/db'
import { landingLocalBusinessJsonLd } from '../../lib/landings/jsonld'
import { landingPublicUrl } from '../../lib/landings/paths'
import { createPublicLandingClient } from '../../lib/landings/public-client'
import { seoAbsoluteUrl } from '../../lib/seo/assets'
import { logger } from '../../lib/logger'
import type { LandingPagePublicRow, PublicLandingPage } from '../../types/landing'

interface PublicLandingPageProps {
  page: PublicLandingPage
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export default function PublicLandingPageView({ page }: PublicLandingPageProps) {
  const { meta } = page.content
  const canonical = landingPublicUrl(page.slug)
  const jsonLd = landingLocalBusinessJsonLd(page)

  return (
    <>
      <Head>
        <title>{meta.seoTitle}</title>
        <meta name="description" content={meta.seoDescription} />
        {meta.keywords && <meta name="keywords" content={meta.keywords} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {meta.noindex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow" />
        )}
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={meta.seoTitle} />
        <meta property="og:description" content={meta.seoDescription} />
        <meta property="og:url" content={canonical} />
        {meta.ogImageUrl && <meta property="og:image" content={seoAbsoluteUrl(meta.ogImageUrl)} />}
      </Head>
      {jsonLd ? <SchemaMarkup schema={jsonLd} /> : null}
      <LandingRenderer page={page} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps<PublicLandingPageProps> = async (ctx) => {
  const raw = ctx.params?.slug
  const slug = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase().trim() ?? ''

  if (!slug || !SLUG_PATTERN.test(slug) || slug.length > 63) {
    return { notFound: true }
  }

  let row: LandingPagePublicRow | null = null

  try {
    const supabase = createPublicLandingClient()
    const { data, error } = await supabase
      .from(LANDING_PAGES_TABLE)
      .select(LANDING_PAGE_PUBLIC_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      logger.error('Error leyendo landing publicada', { slug, error: error.message })
      return { notFound: true }
    }

    row = (data as LandingPagePublicRow | null) ?? null
  } catch (err: unknown) {
    logger.error('Fallo el cliente público de landings', {
      slug,
      error: err instanceof Error ? err.message : 'Unknown',
    })
    return { notFound: true }
  }

  if (!row) {
    return { notFound: true }
  }

  const page = toPublicLandingPage(row)
  if (!page) {
    // toPublicLandingPage ya registró el motivo: snapshot ilegible o sin bloques válidos.
    return { notFound: true }
  }

  // Cache de CDN: la página cambia solo al publicar, y revalida en background.
  ctx.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')

  return { props: { page } }
}
