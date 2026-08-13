import { GetServerSideProps } from 'next'
import { recursosAdapter } from '../lib/recursos'
import { INFO_FUNNEL_PUBLIC_PATH } from '../lib/marketing/info-funnel-path'
import { VIERNES_PUBLIC_PATH } from '../lib/marketing/viernes-copy'
import { PRIVACY_PUBLIC_PATH, TERMS_PUBLIC_PATH } from '../lib/marketing/legal-paths'
import { deductionCalculatorPublicPath } from '../lib/marketing/calculator-public-paths'
import { localizedHref } from '../lib/i18n/locale'
import { BILINGUAL_LANDING_PATHS } from '../lib/i18n/bilingual-paths'

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  /** When true, emit ES + EN locs with xhtml:link alternates. */
  bilingual?: boolean
}

const BASE_URL = 'https://humanosisu.net'

/** Only paths with real EN dictionaries (shared with LandingHreflang). */
const BILINGUAL_CORE = new Set<string>(BILINGUAL_LANDING_PATHS)

// Public pages that should be included in sitemap
const publicPages: SitemapUrl[] = [
  {
    loc: '/',
    changefreq: 'weekly',
    priority: 1.0,
    lastmod: new Date().toISOString().split('T')[0],
    bilingual: true,
  },
  {
    loc: '/activar',
    changefreq: 'monthly',
    priority: 0.9,
  },
  {
    loc: '/ventas',
    changefreq: 'weekly',
    priority: 0.85,
    lastmod: new Date().toISOString().split('T')[0],
  },
  {
    loc: '/alternativa-odoo-honduras',
    changefreq: 'monthly',
    priority: 0.9,
    bilingual: true,
  },
  {
    loc: '/sistema-biometrico-nomina',
    changefreq: 'monthly',
    priority: 0.8,
    bilingual: true,
  },
  {
    loc: '/implementacion-48-horas',
    changefreq: 'monthly',
    priority: 0.8,
    bilingual: true,
  },
  {
    loc: '/deducciones-honduras-ihss-rap-isr',
    changefreq: 'monthly',
    priority: 0.8,
    bilingual: true,
  },
  {
    loc: '/afiliados',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    loc: '/recursos',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    loc: '/recursos/rrhh',
    changefreq: 'weekly',
    priority: 0.75,
  },
  {
    loc: '/recursos/responsabilidad-individual',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    loc: '/calculadora',
    changefreq: 'monthly',
    priority: 0.75,
    bilingual: true,
  },
  {
    loc: '/calculadora-prestaciones',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    loc: deductionCalculatorPublicPath('HND'),
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    loc: INFO_FUNNEL_PUBLIC_PATH,
    changefreq: 'weekly',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0],
  },
  {
    loc: VIERNES_PUBLIC_PATH,
    changefreq: 'weekly',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0],
  },
  {
    loc: deductionCalculatorPublicPath('SLV'),
    changefreq: 'monthly',
    priority: 0.75,
  },
  {
    loc: deductionCalculatorPublicPath('GTM'),
    changefreq: 'monthly',
    priority: 0.75,
  },
  {
    loc: '/calculadora-aguinaldo-honduras',
    changefreq: 'monthly',
    priority: 0.75,
  },
  {
    loc: '/calculadora-catorceavo-honduras',
    changefreq: 'monthly',
    priority: 0.75,
  },
  {
    loc: PRIVACY_PUBLIC_PATH,
    changefreq: 'yearly',
    priority: 0.5,
    bilingual: true,
  },
  {
    loc: TERMS_PUBLIC_PATH,
    changefreq: 'yearly',
    priority: 0.4,
    bilingual: true,
  },
  {
    loc: '/suscripcion',
    changefreq: 'weekly',
    priority: 0.85,
    lastmod: new Date().toISOString().split('T')[0],
  },
]

function absoluteUrl(path: string): string {
  return `${BASE_URL}${path}`
}

function xhtmlAlternates(esPath: string, enPath: string): string {
  const es = absoluteUrl(esPath)
  const en = absoluteUrl(enPath)
  return [
    `    <xhtml:link rel="alternate" hreflang="es" href="${es}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${es}"/>`,
  ].join('\n')
}

function urlEntry(url: SitemapUrl, locOverride?: string, alternates?: string): string {
  const loc = locOverride ?? url.loc
  const urlElements = [
    `    <loc>${absoluteUrl(loc)}</loc>`,
    alternates ?? null,
    url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : null,
    url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : null,
    url.priority ? `    <priority>${url.priority}</priority>` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `  <url>\n${urlElements}\n  </url>`
}

function expandUrls(urls: SitemapUrl[]): string {
  return urls
    .flatMap((url) => {
      const bilingual = url.bilingual === true || BILINGUAL_CORE.has(url.loc)
      if (!bilingual) {
        return [urlEntry(url)]
      }
      const esPath = localizedHref('es', url.loc)
      const enPath = localizedHref('en', url.loc)
      const alts = xhtmlAlternates(esPath, enPath)
      return [urlEntry(url, esPath, alts), urlEntry(url, enPath, alts)]
    })
    .join('\n')
}

function generateSitemap(urls: SitemapUrl[]): string {
  const urlsXml = expandUrls(urls)

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>`
}

export default function Sitemap() {
  // This component should never render
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const recursos = await recursosAdapter.getRecursosList()
  const recursoPages: SitemapUrl[] = recursos.map((recurso) => ({
    loc: `/recursos/${recurso.slug}`,
    changefreq: 'monthly',
    priority: 0.7,
    lastmod: recurso.dateModified ?? recurso.datePublished,
  }))

  const sitemap = generateSitemap([...publicPages, ...recursoPages])

  res.setHeader('Content-Type', 'text/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(sitemap)
  res.end()

  return {
    props: {},
  }
}
