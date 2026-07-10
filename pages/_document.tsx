import { Html, Head, Main, NextScript } from 'next/document'
import { resolveMetaPixelId } from '../lib/analytics/meta-pixel-id'

/**
 * Mismo patrón que gtag (AW-…): ID público en el HTML.
 * Env opcional en build/runtime; fallback al píxel de Events Manager.
 */
const META_PIXEL_ID = resolveMetaPixelId()

const GADS_CONVERSION_ID = 'AW-17840996991'
const GA4_MEASUREMENT_ID =
  process.env['NEXT_PUBLIC_GA4_MEASUREMENT_ID']?.trim() || 'G-4N343EZLY9'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* Google tag (gtag.js) — un solo loader; GA4 + Google Ads */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', ${JSON.stringify(GA4_MEASUREMENT_ID)});
              gtag('config', ${JSON.stringify(GADS_CONVERSION_ID)});
            `,
          }}
        />

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', ${JSON.stringify(META_PIXEL_ID)});
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            alt=""
            src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
          />
        </noscript>

        <link rel="icon" href="/logo-humano-sisu.png" />
        <link rel="shortcut icon" href="/logo-humano-sisu.png" />
        <link rel="apple-touch-icon" href="/logo-humano-sisu.png" />

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
