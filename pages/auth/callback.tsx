import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import PublicPageShell from '../../components/landing/PublicPageShell'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const { next } = router.query
    const redirectTo = (next as string) || '/onboarding'
    
    setTimeout(() => {
      router.push(redirectTo)
    }, 1000)
  }, [router])

  return (
    <>
      <Head>
        <title>Verificando acceso...</title>
        <meta name="description" content="Procesando tu autenticación" />
      </Head>

      <PublicPageShell centered showFooter={false}>
        <div className="w-full max-w-md space-y-8 p-4">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-900"></div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Verificando acceso...
            </h1>
            <p className="text-brand-200/90">
              Te estamos redirigiendo a tu dashboard
            </p>
          </div>
        </div>
      </PublicPageShell>
    </>
  )
}
