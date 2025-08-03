import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es" className="dark">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0c0c0c" />
        <meta name="description" content="Sistema moderno de recursos humanos" />
      </Head>
      <body className="bg-zinc-900 text-zinc-100 font-inter antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
