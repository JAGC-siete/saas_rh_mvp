import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Document shell only — third-party analytics load via MarketingAnalytics
 * on public marketing routes (not on /app), after cookie opt-in.
 */
export default function Document() {
  const landingToneScript = `(function(){try{var t=localStorage.getItem('hs_landing_tone');if(t!=='dark'&&t!=='light'){var m=document.cookie.match(/(?:^|; )hs_landing_tone=([^;]*)/);t=m?decodeURIComponent(m[1]):'dark';}if(t!=='dark'&&t!=='light')t='dark';document.documentElement.dataset.landingTone=t;}catch(e){document.documentElement.dataset.landingTone='dark';}})();`

  return (
    <Html lang="es" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/brand/favicon-48.png" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />

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
