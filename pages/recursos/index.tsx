import Head from 'next/head'
import PublicPageShell from '../../components/landing/PublicPageShell'
import SchemaMarkup from '../../components/SEO/SchemaMarkup'
import RecursosBentoHub from '../../components/recursos/RecursosBentoHub'
import { getPageTitle } from '../../lib/seo/title'
import { getPageDescription } from '../../lib/seo/description'
import { generateWebPageSchema } from '../../lib/seo/schema'
import { recursosAdapter } from '../../lib/recursos'
import type { RecursoCategory } from '../../lib/recursos'
import { GetServerSideProps } from 'next'

interface RecursosIndexProps {
  counts: Record<RecursoCategory, number>
}

export default function RecursosIndex({ counts }: RecursosIndexProps) {
  const pageTitle = getPageTitle('recursos')
  const pageDescription = getPageDescription('recursos')
  const webPageSchema = generateWebPageSchema({
    url: '/recursos',
    title: pageTitle,
    description: pageDescription,
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
        <meta
          name="keywords"
          content="automatización RH regional, nómina local, artículos, recursos, MIPYMES, liderazgo"
        />
      </Head>
      <SchemaMarkup schema={webPageSchema} />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-10 sm:mb-14 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-3">Centro de conocimiento</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Recursos</h1>
          <p className="text-brand-200 text-lg">{pageDescription}</p>
        </header>

        <RecursosBentoHub counts={counts} />
      </div>
    </PublicPageShell>
  )
}

export const getServerSideProps: GetServerSideProps<RecursosIndexProps> = async ({ res }) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  const counts = await recursosAdapter.getRecursosCountByCategory()
  return { props: { counts } }
}
