import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../../components/landing/PublicPageShell'
import { getPageTitle } from '../../lib/seo/title'
import { getPageDescription } from '../../lib/seo/description'
import SchemaMarkup from '../../components/SEO/SchemaMarkup'
import { generateWebPageSchema } from '../../lib/seo/schema'
import { recursosAdapter } from '../../lib/recursos'
import type { RecursoListItem } from '../../lib/recursos'
import { GetServerSideProps } from 'next'

interface RecursosIndexProps {
  items: RecursoListItem[]
}

export default function RecursosIndex({ items }: RecursosIndexProps) {
  const pageTitle = getPageTitle('recursos')
  const pageDescription = getPageDescription('recursos')
  const webPageSchema = generateWebPageSchema({
    url: '/recursos',
    title: pageTitle,
    description: pageDescription
  })

  return (
    <PublicPageShell>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humanosisu.net/recursos" />
        <link rel="canonical" href="https://humanosisu.net/recursos" />
        <meta name="keywords" content="automatización RH regional, nómina local, artículos, recursos, MIPYMES" />
      </Head>
      <SchemaMarkup schema={webPageSchema} />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Recursos</h1>
        <p className="text-brand-200 mb-10">{pageDescription}</p>

        {items.length === 0 ? (
          <p className="text-brand-300">No hay artículos aún.</p>
        ) : (
          <ul className="space-y-6">
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/recursos/${item.slug}`}
                  className="block p-4 rounded-lg glass-modern border border-brand-800 hover:border-brand-600 transition-colors"
                >
                  <h2 className="text-xl font-semibold text-white mb-1">{item.title}</h2>
                  <p className="text-brand-300 text-sm mb-2">{item.description}</p>
                  <time className="text-brand-400 text-xs" dateTime={item.datePublished}>
                    {new Date(item.datePublished).toLocaleDateString('es-HN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 text-center glass-modern rounded-2xl p-6 sm:p-8 border border-white/10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">¿Listo para automatizar tu nómina?</h2>
          <p className="text-brand-200/90 mb-6 max-w-2xl mx-auto">
            Pon en práctica lo que leíste: Humano SISU integra asistencia biométrica y planilla con deducciones de ley.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/activar"
              className="inline-flex justify-center py-3 px-6 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors"
            >
              Probar gratis 30 días
            </Link>
            <Link
              href="/calculadora"
              className="inline-flex justify-center py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/15 transition-colors"
            >
              Ver calculadoras
            </Link>
          </div>
        </div>
      </div>
    </PublicPageShell>
  )
}

export const getServerSideProps: GetServerSideProps<RecursosIndexProps> = async ({ res }) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  const raw = await recursosAdapter.getRecursosList()
  const items = raw.map((item) => ({
    slug: item.slug,
    title: item.title,
    description: item.description,
    datePublished: item.datePublished,
    ...(item.dateModified != null && { dateModified: item.dateModified }),
    ...(item.image != null && { image: item.image }),
    ...(item.author != null && { author: item.author }),
  }))
  return { props: { items } }
}
