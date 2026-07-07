import { GetServerSideProps } from 'next'
import { recursosAdapter } from '../lib/recursos'
import { INFO_FUNNEL_PUBLIC_PATH } from '../lib/marketing/info-funnel-path'
import { deductionCalculatorPublicPath } from '../lib/marketing/calculator-public-paths'

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

const BASE_URL = 'https://humanosisu.net'

// Public pages that should be included in sitemap
const publicPages: SitemapUrl[] = [
  {
    loc: '/',
    changefreq: 'weekly',
    priority: 1.0,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    loc: '/activar',
    changefreq: 'monthly',
    priority: 0.9
  },
  {
    loc: '/alternativa-odoo-honduras',
    changefreq: 'monthly',
    priority: 0.9
  },
  {
    loc: '/sistema-biometrico-nomina',
    changefreq: 'monthly',
    priority: 0.8
  },
  {
    loc: '/implementacion-48-horas',
    changefreq: 'monthly',
    priority: 0.8
  },
  {
    loc: '/deducciones-honduras-ihss-rap-isr',
    changefreq: 'monthly',
    priority: 0.8
  },
  {
    loc: '/afiliados',
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/recursos',
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/recursos/rrhh',
    changefreq: 'weekly',
    priority: 0.75
  },
  {
    loc: '/recursos/responsabilidad-individual',
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/calculadora',
    changefreq: 'monthly',
    priority: 0.75
  },
  {
    loc: '/calculadora-prestaciones',
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: deductionCalculatorPublicPath('HND'),
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: INFO_FUNNEL_PUBLIC_PATH,
    changefreq: 'weekly',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    loc: '/viernes',
    changefreq: 'weekly',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    loc: deductionCalculatorPublicPath('SLV'),
    changefreq: 'monthly',
    priority: 0.75
  },
  {
    loc: deductionCalculatorPublicPath('GTM'),
    changefreq: 'monthly',
    priority: 0.75
  },
  {
    loc: '/calculadora-aguinaldo-honduras',
    changefreq: 'monthly',
    priority: 0.75
  },
  {
    loc: '/calculadora-catorceavo-honduras',
    changefreq: 'monthly',
    priority: 0.75
  },
  {
    loc: '/politicadeprivacidad',
    changefreq: 'yearly',
    priority: 0.5
  },
  {
    loc: '/terminos-de-servicio',
    changefreq: 'yearly',
    priority: 0.4
  },
  {
    loc: '/suscripcion',
    changefreq: 'weekly',
    priority: 0.85,
    lastmod: new Date().toISOString().split('T')[0]
  }
]

function generateSitemap(urls: SitemapUrl[]): string {
  const urlsXml = urls
    .map((url) => {
      const urlElements = [
        `    <loc>${BASE_URL}${url.loc}</loc>`,
        url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : null,
        url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : null,
        url.priority ? `    <priority>${url.priority}</priority>` : null
      ]
        .filter(Boolean)
        .join('\n')

      return `  <url>\n${urlElements}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
    lastmod: recurso.dateModified ?? recurso.datePublished
  }))

  const sitemap = generateSitemap([...publicPages, ...recursoPages])

  res.setHeader('Content-Type', 'text/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(sitemap)
  res.end()

  return {
    props: {}
  }
}

