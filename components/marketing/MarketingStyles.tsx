import Head from 'next/head'

export type MarketingStyleSheet = 'landing' | 'landing-liquid' | 'paz' | 'viernes' | 'activar'

const HREF: Record<MarketingStyleSheet, string> = {
  landing: '/styles/landing.css',
  'landing-liquid': '/styles/landing-liquid.css',
  paz: '/styles/paz-landing.css',
  viernes: '/styles/viernes-landing.css',
  activar: '/styles/activar-landing.css',
}

/** Route-scoped marketing CSS — keeps campaign/landing rules off /app/* (Remove unused CSS). */
export default function MarketingStyles({ sheets }: { sheets: MarketingStyleSheet[] }) {
  return (
    <Head>
      {sheets.map((sheet) => (
        <link key={sheet} rel="stylesheet" href={HREF[sheet]} />
      ))}
    </Head>
  )
}
