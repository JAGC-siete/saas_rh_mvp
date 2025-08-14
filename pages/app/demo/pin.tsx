import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import DemoFooter from '../../../components/DemoFooter'
import { logger } from '../../../lib/logger'

export default function DemoPin() {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [blockedMinutes, setBlockedMinutes] = useState<number | null>(null)
  const router = useRouter()
  const { next } = router.query

  // Auto-focus on PIN input
  useEffect(() => {
    const input = document.getElementById('pin-input')
    if (input) {
      input.focus()
    }
  }, [])

  // Handle countdown for blocked state
  useEffect(() => {
    if (blockedMinutes && blockedMinutes > 0) {
      const interval = setInterval(() => {
        setBlockedMinutes(prev => {
          if (prev && prev > 1) {
            return prev - 1
          } else {
            setError('')
            setBlockedMinutes(null)
            return null
          }
        })
      }, 60000) // Update every minute

      return () => clearInterval(interval)
    }
  }, [blockedMinutes])

  const handlePinChange = (value: string) => {
    // Only allow numeric input, max 4 digits
    const numeric = value.replace(/\D/g, '').slice(0, 4)
    setPin(numeric)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (pin.length !== 4) {
      setError('PIN debe ser de 4 dígitos')
      return
    }

    if (loading || blockedMinutes) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/demo/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (response.ok) {
        logger.info('Demo PIN verified, redirecting', { 
          next: next || '/app/demo' 
        })
        
        // Success - redirect to intended page or demo home
        const redirectUrl = (next as string) || '/app/demo'
        window.location.href = redirectUrl
      } else {
        // Handle different error types
        if (response.status === 429) {
          setBlockedMinutes(data.blockedMinutes || data.remainingMinutes)
        } else {
          setRemainingAttempts(data.remainingAttempts)
        }
        setError(data.error || data.message || 'Error desconocido')
      }
    } catch (error) {
      logger.error('Error submitting PIN', error)
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
      setPin('') // Clear PIN input
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const isBlocked = Boolean(blockedMinutes && blockedMinutes > 0)

  return (
    <>
      <Head>
        <title>Demo PIN - Humano SISU</title>
        <meta name="description" content="Accede al demo de Humano SISU con tu PIN de 4 dígitos" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Demo Humano SISU</h2>
            <p className="mt-2 text-sm text-gray-600">
              Ingresa tu PIN de 4 dígitos para acceder al demo
            </p>
          </div>

          {/* PIN Form */}
          <div className="glass rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="pin-input" className="block text-sm font-medium text-gray-700 mb-2">
                  PIN de Acceso
                </label>
                <input
                  id="pin-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="• • • •"
                  disabled={loading || isBlocked}
                  className="block w-full px-4 py-3 text-center text-2xl font-mono input-glass rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="off"
                  maxLength={4}
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-red-800">{error}</p>
                      {isBlocked && (
                        <p className="text-xs text-red-600 mt-1">
                          Tiempo restante: {blockedMinutes} minutos
                        </p>
                      )}
                      {remainingAttempts !== null && remainingAttempts > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Intentos restantes: {remainingAttempts}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || pin.length !== 4 || isBlocked}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando...
                  </>
                ) : isBlocked ? (
                  `Bloqueado (${blockedMinutes}m)`
                ) : (
                  'Acceder al Demo'
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                ¿No tienes el PIN? Contacta con nuestro equipo de ventas.
              </p>
            </div>
          </div>

        </div>
        <DemoFooter />
      </div>
    </>
  )
}
