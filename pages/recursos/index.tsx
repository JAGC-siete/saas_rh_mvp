import Head from 'next/head'
import Link from 'next/link'
import MainHeader from '../../components/MainHeader'
import DemoFooter from '../../components/DemoFooter'
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
    <div className="min-h-screen bg-app text-white flex flex-col pt-16 sm:pt-20 md:pt-24">
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

      <MainHeader enableScrollEffect={true} fixed={true} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
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
                  className="block p-4 rounded-lg border border-brand-800 hover:border-brand-600 transition-colors"
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
      </main>

      <DemoFooter />
    </div>
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
