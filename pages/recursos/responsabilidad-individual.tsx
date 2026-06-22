import Head from 'next/head'
import PublicPageShell from '../../components/landing/PublicPageShell'
import SchemaMarkup from '../../components/SEO/SchemaMarkup'
import Breadcrumbs from '../../components/SEO/Breadcrumbs'
import RecursoFeaturedArticle from '../../components/recursos/RecursoFeaturedArticle'
import RecursoListCard from '../../components/recursos/RecursoListCard'
import { RECURSO_CATEGORY_META } from '../../lib/recursos/categories'
import { generateWebPageSchema } from '../../lib/seo/schema'
import { recursosAdapter } from '../../lib/recursos'
import type { RecursoListItem } from '../../lib/recursos'
import { GetServerSideProps } from 'next'

interface RecursosFactorHumanoProps {
  items: RecursoListItem[]
}

const meta = RECURSO_CATEGORY_META['responsabilidad-individual']

export default function RecursosFactorHumanoPage({ items }: RecursosFactorHumanoProps) {
  const webPageSchema = generateWebPageSchema({
    url: meta.path,
    title: meta.pageTitle,
    description: meta.pageDescription,
  })

  const breadcrumbItems = [
    { name: 'Inicio', url: '/' },
    { name: 'Recursos', url: '/recursos' },
    { name: meta.breadcrumbLabel, url: meta.path },
  ]

  const [featured, ...rest] = items

  return (
    <PublicPageShell>
      <Head>
        <title>{meta.pageTitle}</title>
        <meta name="description" content={meta.pageDescription} />
        <meta property="og:title" content={meta.pageTitle} />
        <meta property="og:description" content={meta.pageDescription} />
        <meta property="og:url" content={`https://humanosisu.net${meta.path}`} />
        <link rel="canonical" href={`https://humanosisu.net${meta.path}`} />
      </Head>
      <SchemaMarkup schema={webPageSchema} />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={breadcrumbItems} />

        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60 mb-2">Colección</p>
          <h1 className="text-3xl font-bold text-white mb-2">{meta.hubTitle}</h1>
          <p className="text-brand-200">{meta.hubSubtitle}</p>
        </header>

        {items.length === 0 ? (
          <p className="text-brand-300">No hay ensayos en esta colección aún.</p>
        ) : featured ? (
          <div className="space-y-8">
            <RecursoFeaturedArticle item={featured} />
            {rest.length > 0 && (
              <ul className="space-y-5">
                {rest.map((item) => (
                  <RecursoListCard key={item.slug} item={item} />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </PublicPageShell>
  )
}

export const getServerSideProps: GetServerSideProps<RecursosFactorHumanoProps> = async ({ res }) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  const raw = await recursosAdapter.getRecursosList({ category: 'responsabilidad-individual' })
  const items = raw.map((item) => ({
    slug: item.slug,
    title: item.title,
    description: item.description,
    datePublished: item.datePublished,
    category: item.category,
    ...(item.dateModified != null && { dateModified: item.dateModified }),
    ...(item.image != null && { image: item.image }),
    ...(item.author != null && { author: item.author }),
  }))

  return { props: { items } }
}
