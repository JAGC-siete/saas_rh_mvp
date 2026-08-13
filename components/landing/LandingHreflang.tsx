import Head from 'next/head'
import { useRouter } from 'next/router'
import { getLocaleFromAsPath, localizedHref, stripLocalePrefix } from '../../lib/i18n/locale'
import { isBilingualLandingPath } from '../../lib/i18n/bilingual-paths'

const BASE = 'https://humanosisu.net'

/**
 * Single owner of marketing canonical + hreflang (+ og:url/locale).
 * EN alternate only when the path has real EN copy.
 */
export default function LandingHreflang() {
  const router = useRouter()
  const locale = getLocaleFromAsPath(router.asPath || '/')
  const bare = stripLocalePrefix(router.asPath || '/')
  const pathOnly = bare.split(/[?#]/)[0] || '/'
  const bilingual = isBilingualLandingPath(pathOnly)
  const esPath = localizedHref('es', pathOnly)
  const enPath = localizedHref('en', pathOnly)
  const esHref = `${BASE}${esPath}`
  const enHref = `${BASE}${enPath}`
  // Non-bilingual EN URL still resolves via rewrite but must not claim a distinct EN document.
  const canonical = bilingual && locale === 'en' ? enHref : esHref

  return (
    <Head>
      <link key="landing-canonical" rel="canonical" href={canonical} />
      <link key="landing-hreflang-es" rel="alternate" hrefLang="es" href={esHref} />
      {bilingual ? (
        <link key="landing-hreflang-en" rel="alternate" hrefLang="en" href={enHref} />
      ) : null}
      <link key="landing-hreflang-x" rel="alternate" hrefLang="x-default" href={esHref} />
      <meta key="landing-og-url" property="og:url" content={canonical} />
      <meta key="landing-og-locale" property="og:locale" content={locale === 'en' && bilingual ? 'en_US' : 'es_HN'} />
      {bilingual && locale === 'en' ? (
        <meta key="landing-og-locale-alt" property="og:locale:alternate" content="es_HN" />
      ) : bilingual ? (
        <meta key="landing-og-locale-alt" property="og:locale:alternate" content="en_US" />
      ) : null}
    </Head>
  )
}
