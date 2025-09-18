import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../../components/CloudBackground'), { ssr: false })
import { createClient as createSupabaseBrowserClient } from '../../lib/supabase/client'

export default function AuthConfirm() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verificando tu acceso...')

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        const { token_hash, type } = router.query
        
        if (!token_hash || !type) {
          setStatus('error')
          setMessage('Enlace inválido. Faltan parámetros necesarios.')
          return
        }

        const supabase = await createSupabaseBrowserClient()
        if (!supabase) {
          setStatus('error')
          setMessage('Error de configuración. Intenta de nuevo.')
          return
        }

        // Verificar el token hash del Magic Link
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token_hash as string,
          type: 'email'
        })

        if (error) {
          console.error('Error verifying magic link:', error)
          setStatus('error')
          
          if (error.message.includes('expired')) {
            setMessage('El enlace ha expirado. Solicita uno nuevo.')
          } else if (error.message.includes('invalid')) {
            setMessage('Enlace inválido o ya usado. Solicita uno nuevo.')
          } else {
            setMessage('Error verificando el enlace. Intenta de nuevo.')
          }
          return
        }

        if (data.user) {
          setStatus('success')
          setMessage('¡Acceso verificado! Te estamos redirigiendo...')
          
          // Create user profile if it doesn't exist
          try {
            const response = await fetch('/api/auth/fix-user-creation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id })
            })
            
            if (!response.ok) {
              const errorData = await response.json()
              console.warn('Could not create user profile:', errorData)
            } else {
              console.log('User profile created successfully')
            }
          } catch (error) {
            console.warn('Could not create user profile:', error)
            // Don't fail the auth process if profile creation fails
          }
          
          // Redirigir después de un breve delay
          setTimeout(() => {
            const next = router.query.next as string || '/onboarding'
            router.push(next)
          }, 2000)
        } else {
          setStatus('error')
          setMessage('No se pudo verificar el acceso. Intenta de nuevo.')
        }

      } catch (err) {
        console.error('Unexpected error:', err)
        setStatus('error')
        setMessage('Error inesperado. Intenta de nuevo.')
      }
    }

    // Solo ejecutar si tenemos los query parameters
    if (router.isReady && router.query.token_hash) {
      handleMagicLink()
    }
  }, [router.isReady, router.query, router])

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-900"></div>
        )
      case 'success':
        return (
          <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-brand-200/90'
      case 'success':
        return 'text-green-200'
      case 'error':
        return 'text-red-200'
    }
  }

  return (
    <>
      <Head>
        <title>Verificando acceso - Humano SISU</title>
        <meta name="description" content="Verificando tu acceso seguro" />
      </Head>

      <div className="min-h-screen bg-app flex items-center justify-center p-4 relative">
        <CloudBackground />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTI5M2IiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative w-full max-w-md space-y-8 z-10">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
              {getStatusIcon()}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {status === 'loading' && 'Verificando acceso...'}
              {status === 'success' && '¡Acceso verificado!'}
              {status === 'error' && 'Error de verificación'}
            </h1>
            <p className={getStatusColor()}>
              {message}
            </p>
            
            {status === 'error' && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => router.push('/auth/start')}
                  className="w-full bg-brand-900 hover:bg-brand-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full text-brand-300 hover:text-white transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
