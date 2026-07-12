import Head from 'next/head'

const BASE_URL = 'https://humanosisu.net'

interface PublicPageHeadProps {
  title: string
  description: string
  /** Path only, e.g. `/activar` */
  canonicalPath: string
  noindex?: boolean
  keywords?: string
}

export default function PublicPageHead({
  title,
  description,
  canonicalPath,
  noindex = false,
  keywords,
}: PublicPageHeadProps) {
  const canonical = `${BASE_URL}${canonicalPath}`

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
    </Head>
  )
}
