import { Html, Head, Main, NextScript, DocumentProps } from 'next/document'

export default function Document(props: DocumentProps) {
  const locale = props.locale || 'es'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  const path = props.__NEXT_DATA__.page === '/' ? '' : props.__NEXT_DATA__.page
  const localePath = locale === 'es' ? '' : `/${locale}`
  const canonical = baseUrl ? `${baseUrl}${localePath}${path}` : undefined

  return (
    <Html lang={locale}>
      <Head>
        {baseUrl && (
          <>
            {canonical && <link rel="canonical" href={canonical} />}
            <link rel="alternate" hrefLang="es" href={`${baseUrl}${path}`} />
            <link rel="alternate" hrefLang="en" href={`${baseUrl}/en${path}`} />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
