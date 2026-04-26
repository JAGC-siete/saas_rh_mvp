import Head from 'next/head'
import MainHeader from '../../components/MainHeader'
import DemoFooter from '../../components/DemoFooter'
import SchemaMarkup from '../../components/SEO/SchemaMarkup'
import Breadcrumbs from '../../components/SEO/Breadcrumbs'
import { generateArticleSchema } from '../../lib/seo/schema'
import { recursosAdapter } from '../../lib/recursos'
import type { RecursoMeta } from '../../lib/recursos'
import { GetStaticPaths, GetStaticProps } from 'next'

interface RecursoPageProps {
  article: RecursoMeta
}

export default function RecursoPage({ article }: RecursoPageProps) {
  const canonical = `https://humanosisu.net/recursos/${article.slug}`
  const articleSchema = generateArticleSchema({
    url: `/recursos/${article.slug}`,
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    image: article.image,
    author: article.author
  })
  const breadcrumbItems = [
    { name: 'Inicio', url: '/' },
    { name: 'Recursos', url: '/recursos' },
    { name: article.title, url: `/recursos/${article.slug}` }
  ]

  return (
    <div className="min-h-screen bg-app text-white flex flex-col pt-16 sm:pt-20 md:pt-24">
      <Head>
        <title>{article.title} | Humano SISU</title>
        <meta name="description" content={article.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        {article.image && <meta property="og:image" content={article.image.startsWith('http') ? article.image : `https://humanosisu.net${article.image}`} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.description} />
      </Head>
      <SchemaMarkup schema={articleSchema} />

      <MainHeader enableScrollEffect={true} fixed={true} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={breadcrumbItems} />

        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
            <div className="flex items-center gap-4 text-brand-300 text-sm">
              <time dateTime={article.datePublished}>
                {new Date(article.datePublished).toLocaleDateString('es-HN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
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
      </main>

      <DemoFooter />
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = await recursosAdapter.getAllSlugs()
  return {
    paths: slugs.map(({ slug }) => ({ params: { slug } })),
    fallback: 'blocking'
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
    ...(article.dateModified != null && { dateModified: article.dateModified }),
    ...(article.image != null && { image: article.image }),
    ...(article.author != null && { author: article.author })
  }
  return {
    props: { article: articleSerialized },
    revalidate: 3600
  }
}
