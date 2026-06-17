import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import PublicPageShell from '../../components/landing/PublicPageShell'
import { Card, CardContent } from '../../components/ui/card'
import MailListSubscription from '../../components/MailListSubscription'

export default function MailListUnsubscribePage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const { success, error } = router.query

    if (success === 'true') {
      setStatus('success')
    } else if (error) {
      setStatus('error')
      switch (error) {
        case 'invalid_token':
          setErrorMessage('El enlace de baja no es válido o ha expirado.')
          break
        case 'update_failed':
          setErrorMessage('No se pudo procesar tu solicitud de baja. Por favor intenta de nuevo.')
          break
        case 'server_error':
          setErrorMessage('Error del servidor. Por favor intenta más tarde.')
          break
        default:
          setErrorMessage('Ocurrió un error al procesar tu solicitud.')
      }
    } else {
      setStatus('idle')
    }
  }, [router.query])

  return (
    <PublicPageShell centered>
      <Head>
        <title>Darse de Baja - Humano SISU</title>
        <meta name="description" content="Darse de baja de la lista de correo de Humano SISU" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="liquid">
          <CardContent className="p-6 sm:p-8 md:p-12">
            {status === 'loading' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Procesando...
                </h1>
                <p className="text-brand-200/80">
                  Procesando tu solicitud de baja
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Te has dado de baja exitosamente
                </h1>
                <p className="text-brand-200/90 text-lg mb-6">
                  Tu solicitud de baja ha sido procesada exitosamente. Ya no recibirás más emails de nuestra lista de correo.
                </p>
                <p className="text-brand-200/70 text-sm mb-8">
                  Si cambias de opinión, siempre puedes volver a suscribirte cuando quieras.
                </p>
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
                  Error al Procesar
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
                </div>
              </div>
            )}

            {status === 'idle' && (
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Darse de Baja
                </h1>
                <p className="text-brand-200/90 text-lg mb-4">
                  Si recibiste este enlace por error o necesitas ayuda, contáctanos directamente.
                </p>
                <p className="text-brand-200/70 text-sm mb-8">
                  O simplemente ignora este mensaje si no deseas darte de baja.
                </p>
                <div className="space-y-6">
                  <Link href="/">
                    <button className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold shadow-sm bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1">
                      Volver al Inicio
                    </button>
                  </Link>
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-brand-200/70 text-sm mb-4">
                      ¿Cambiaste de opinión? Vuelve a suscribirte:
                    </p>
                    <MailListSubscription source="unsubscribe_page" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  )
}
