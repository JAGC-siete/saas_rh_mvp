import Head from 'next/head'

export type MarketingStyleSheet = 'landing' | 'landing-liquid' | 'paz' | 'viernes' | 'activar'

const HREF: Record<MarketingStyleSheet, string> = {
  landing: '/styles/landing.css',
  'landing-liquid': '/styles/landing-liquid.css',
  paz: '/styles/paz-landing.css',
  viernes: '/styles/viernes-landing.css',
  activar: '/styles/activar-landing.css',
}

/**
 * public/styles/* is cached by CF (max-age=14400) without content hash.
 * Query bust so HTML deploys don't keep serving stale campaign CSS.
 */
const CSS_V =
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 8) ||
  process.env.NEXT_PUBLIC_ASSET_VERSION ||
  '20260825a'

/** Route-scoped marketing CSS — keeps campaign/landing rules off /app/* (Remove unused CSS). */
export default function MarketingStyles({ sheets }: { sheets: MarketingStyleSheet[] }) {
  return (
    <Head>
      {sheets.map((sheet) => (
        <link key={sheet} rel="stylesheet" href={`${HREF[sheet]}?v=${CSS_V}`} />
      ))}
    </Head>
  )
}
