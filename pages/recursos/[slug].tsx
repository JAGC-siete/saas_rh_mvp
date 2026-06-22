import Head from 'next/head'
import Link from 'next/link'
import PublicPageShell from '../../components/landing/PublicPageShell'
import SchemaMarkup from '../../components/SEO/SchemaMarkup'
import Breadcrumbs from '../../components/SEO/Breadcrumbs'
import RecursoAuthorSignature from '../../components/recursos/RecursoAuthorSignature'
import RecursoSalesCta from '../../components/recursos/RecursoSalesCta'
import { RECURSO_CATEGORY_META } from '../../lib/recursos/categories'
import { generateArticleSchema } from '../../lib/seo/schema'
import { recursosAdapter } from '../../lib/recursos'
import type { RecursoMeta } from '../../lib/recursos'
import { GetStaticPaths, GetStaticProps } from 'next'

interface RecursoPageProps {
  article: RecursoMeta
}

export default function RecursoPage({ article }: RecursoPageProps) {
  const canonical = `https://humanosisu.net/recursos/${article.slug}`
  const collectionMeta = RECURSO_CATEGORY_META[article.category]
  const isFactorHumano = article.category === 'responsabilidad-individual'

  const articleSchema = generateArticleSchema({
    url: `/recursos/${article.slug}`,
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    image: article.image,
    author: article.author,
    articleSection: collectionMeta.breadcrumbLabel,
  })

  const breadcrumbItems = [
    { name: 'Inicio', url: '/' },
    { name: 'Recursos', url: '/recursos' },
    { name: collectionMeta.breadcrumbLabel, url: collectionMeta.path },
    { name: article.title, url: `/recursos/${article.slug}` },
  ]

  return (
    <PublicPageShell>
      <Head>
        <title>{article.title} | Humano SISU</title>
        <meta name="description" content={article.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        {article.image && (
          <meta
            property="og:image"
            content={article.image.startsWith('http') ? article.image : `https://humanosisu.net${article.image}`}
          />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.description} />
      </Head>
      <SchemaMarkup schema={articleSchema} />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={breadcrumbItems} />

        <article>
          <header className="mb-8">
            <Link
              href={collectionMeta.path}
              className="inline-block text-xs uppercase tracking-[0.3em] text-white/50 hover:text-white/80 mb-3 transition-colors"
            >
              {collectionMeta.breadcrumbLabel}
            </Link>
            <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
            <div className="flex items-center gap-4 text-brand-300 text-sm">
              <time dateTime={article.datePublished}>
                {new Date(article.datePublished).toLocaleDateString('es-HN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {article.author && <span>{article.author}</span>}
            </div>
          </header>
          <div
            className="prose prose-invert prose-lg max-w-none text-brand-200"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {isFactorHumano ? (
          <RecursoAuthorSignature author={article.author} />
        ) : (
          <RecursoSalesCta />
        )}
      </div>
    </PublicPageShell>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = await recursosAdapter.getAllSlugs()
  return {
    paths: slugs.map(({ slug }) => ({ params: { slug } })),
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps<RecursoPageProps, { slug: string }> = async ({ params }) => {
  if (!params?.slug) {
    return { notFound: true }
  }
  const article = await recursosAdapter.getRecursoBySlug(params.slug)
  if (!article) {
    return { notFound: true }
  }
  const articleSerialized: RecursoMeta = {
    slug: article.slug,
    title: article.title,
    description: article.description,
    content: article.content,
    datePublished: article.datePublished,
    category: article.category,
    ...(article.dateModified != null && { dateModified: article.dateModified }),
    ...(article.image != null && { image: article.image }),
    ...(article.author != null && { author: article.author }),
  }
  return {
    props: { article: articleSerialized },
    revalidate: 60,
  }
}
