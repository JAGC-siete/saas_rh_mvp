import Head from 'next/head'
import {
  SEO_BASE_URL,
  SEO_DEFAULT_OG_IMAGE_PATH,
  seoAbsoluteUrl,
} from '../../lib/seo/assets'

interface PublicPageHeadProps {
  title: string
  description: string
  /** Path only, e.g. `/activar` */
  canonicalPath: string
  noindex?: boolean
  keywords?: string
  /** Path or absolute URL; defaults to shared SEO OG image */
  ogImage?: string
}

export default function PublicPageHead({
  title,
  description,
  canonicalPath,
  noindex = false,
  keywords,
  ogImage = SEO_DEFAULT_OG_IMAGE_PATH,
}: PublicPageHeadProps) {
  const canonical = `${SEO_BASE_URL}${canonicalPath}`
  const ogImageUrl = seoAbsoluteUrl(ogImage)

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={canonical} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
    </Head>
  )
}
