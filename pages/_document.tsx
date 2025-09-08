import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <link rel="icon" href="/logo-humano-sisu.png" />
        <link rel="shortcut icon" href="/logo-humano-sisu.png" />
        <link rel="apple-touch-icon" href="/logo-humano-sisu.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 