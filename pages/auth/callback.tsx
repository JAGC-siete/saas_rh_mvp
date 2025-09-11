import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../../components/CloudBackground'), { ssr: false })

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // El callback de Supabase ya maneja el intercambio de código y cookies
    // Solo redirigimos al usuario
    const { next } = router.query
    const redirectTo = (next as string) || '/onboarding'
    
    // Pequeño delay para asegurar que las cookies se establezcan
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

      <div className="min-h-screen bg-app flex items-center justify-center p-4 relative">
        <CloudBackground />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTI5M2IiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative w-full max-w-md space-y-8 z-10">
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
      </div>
    </>
  )
}