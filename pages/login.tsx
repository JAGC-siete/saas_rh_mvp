import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function LoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir inmediatamente a la nueva página de autenticación
    router.replace('/auth/start')
  }, [router])

  return (
    <>
      <Head>
        <title>Redirigiendo...</title>
        <meta name="description" content="Redirigiendo a la página de autenticación" />
      </Head>
      
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Redirigiendo a la página de autenticación...</p>
        </div>
      </div>
    </>
  )
}