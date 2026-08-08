import Head from 'next/head'
import {
  SEO_DEFAULT_OG_IMAGE_PATH,
  SEO_BASE_URL,
  seoAbsoluteUrl,
} from '../../lib/seo/assets'

interface PublicPageHeadProps {
  title: string
  description: string
  /**
   * Bare path (ES), e.g. `/activar`.
   * Canonical + og:url are owned by LandingHreflang under PublicPageShell —
   * do not emit conflicting tags here.
   */
  canonicalPath: string
  noindex?: boolean
  keywords?: string
  /** Path or absolute URL; defaults to shared SEO OG image */
  ogImage?: string
}

/**
 * Title/description/social image tags for public pages.
 * Canonical, hreflang, and og:url live in LandingHreflang (shell).
 */
export default function PublicPageHead({
  title,
  description,
  canonicalPath: _canonicalPath,
  noindex = false,
  keywords,
  ogImage = SEO_DEFAULT_OG_IMAGE_PATH,
}: PublicPageHeadProps) {
  void _canonicalPath
  const ogImageUrl = seoAbsoluteUrl(ogImage)

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
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

/** Absolute URL helper when a page must build schema outside LandingHreflang. */
export function absolutePublicUrl(path: string): string {
  return `${SEO_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
