import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import PublicPageShell from '../components/landing/PublicPageShell'

export default function LoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth/start')
  }, [router])

  return (
    <PublicPageShell centered showFooter={false}>
      <Head>
        <title>Redirigiendo...</title>
        <meta name="description" content="Redirigiendo a la página de autenticación" />
      </Head>
      <div className="text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Redirigiendo a la página de autenticación...</p>
      </div>
    </PublicPageShell>
  )
}
