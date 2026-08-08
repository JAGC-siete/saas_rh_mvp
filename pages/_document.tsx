import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Document shell only — third-party analytics load via MarketingAnalytics
 * on public marketing routes (not on /app), after interaction / long idle.
 */
export default function Document() {
  const landingToneScript = `(function(){try{var t=localStorage.getItem('hs_landing_tone');if(t!=='dark'&&t!=='light'){var m=document.cookie.match(/(?:^|; )hs_landing_tone=([^;]*)/);t=m?decodeURIComponent(m[1]):'dark';}if(t!=='dark'&&t!=='light')t='dark';document.documentElement.dataset.landingTone=t;}catch(e){document.documentElement.dataset.landingTone='dark';}})();`

  return (
    <Html lang="es" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/brand/favicon-humano-sisu.png" />
        <link rel="shortcut icon" href="/brand/favicon-humano-sisu.png" />
        <link rel="apple-touch-icon" href="/brand/logo-humano-sisu-sm.png" />

        {/* Anti-FOUC: apply landing tone before paint */}
        <script dangerouslySetInnerHTML={{ __html: landingToneScript }} />

        {/* Inject environment variables for client-side access */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ENV__ = {
                NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)},
                NEXT_PUBLIC_SUPABASE_ANON_KEY: ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
              };
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
