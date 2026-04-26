import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import MainHeader from '../../components/MainHeader'
import dynamic from 'next/dynamic'

const CloudBackground = dynamic(() => import('../../components/CloudBackground'), { ssr: false })

export default function MailListConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const { success, error } = router.query

    if (success === 'true') {
      setStatus('success')
    } else if (error) {
      setStatus('error')
      switch (error) {
        case 'invalid_token':
          setErrorMessage('El enlace de confirmación no es válido o ha expirado.')
          break
        case 'update_failed':
          setErrorMessage('No se pudo confirmar tu suscripción. Por favor intenta de nuevo.')
          break
        case 'server_error':
          setErrorMessage('Error del servidor. Por favor intenta más tarde.')
          break
        default:
          setErrorMessage('Ocurrió un error al confirmar tu suscripción.')
      }
    }
  }, [router.query])

  return (
    <>
      <Head>
        <title>Confirmar Suscripción - Humano SISU</title>
        <meta name="description" content="Confirma tu suscripción a la lista de correo de Humano SISU" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-app relative">
        <CloudBackground />
        
        {/* Header */}
        <MainHeader enableScrollEffect={false} fixed={false} />

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="glass-strong rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
            {status === 'loading' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Procesando...
                </h1>
                <p className="text-brand-200/80">
                  Confirmando tu suscripción
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  ¡Suscripción Confirmada!
                </h1>
                <p className="text-brand-200/90 text-lg mb-6">
                  ¡Perfecto! Tu suscripción ha sido confirmada. Ahora recibirás ideas prácticas para reducir el ruido, mejorar tu entorno inmediato y recuperar control del espacio propio desempeño (exclusivo para personas que trabajan y/o estudian).
                </p>
                <p className="text-brand-200/70 text-sm mb-6">Gracias por estar aquí.</p>
                <div className="space-y-4">
                  <Link href="/">
                    <button className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold shadow-sm bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1">
                      Volver al Inicio
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-full mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Error al Confirmar
                </h1>
                <p className="text-brand-200/90 text-lg mb-6">
                  {errorMessage}
                </p>
                <div className="space-y-4">
                  <Link href="/">
                    <button className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold shadow-sm bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1">
                      Volver al Inicio
                    </button>
                  </Link>
                  <p className="text-brand-200/70 text-sm">
                    Si el problema persiste, contáctanos directamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

