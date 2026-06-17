import { useState } from 'react'
import { Button } from './ui/button'
import {
  buildMetaApiTrackingFields,
  createMetaEventId,
  trackNewsletterCompleteRegistration,
} from '../lib/analytics/metaPixel'

interface MailListSubscriptionProps {
  source?: string
  className?: string
}

export default function MailListSubscription({ source = 'landing', className = '' }: MailListSubscriptionProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setStatus('error')
      setMessage('Por favor ingresa tu email')
      return
    }

    if (!validateEmail(email)) {
      setStatus('error')
      setMessage('Por favor ingresa un email válido')
      return
    }

    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      const metaEventId = createMetaEventId('subscribe')
      const trimmedEmail = email.trim()
      const response = await fetch('/api/mail-list/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          source,
          ...buildMetaApiTrackingFields(metaEventId),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        trackNewsletterCompleteRegistration({
          eventId: metaEventId,
          email: trimmedEmail,
          source,
        })
        setStatus('success')
        setMessage('¡Te estábamos esperando!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Ocurrió un error. Por favor intenta de nuevo.')
      }
    } catch (error) {
      console.error('Error en suscripción:', error)
      setStatus('error')
      setMessage('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status !== 'idle') {
                setStatus('idle')
                setMessage('')
              }
            }}
            placeholder="tu@correo.com"
            disabled={loading}
            className="input-glass flex-1 min-h-[48px] outline-none focus:ring-2 focus:ring-brand-400 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            required
            aria-label="Email para suscripción"
          />
          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="whitespace-nowrap min-h-[48px] rounded-xl px-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            variant="modern"
          >
            {loading ? 'Enviando...' : 'Suscribirme'}
          </Button>
        </div>

        {/* Mensajes de estado */}
        {status === 'success' && (
          <div className="text-center">
            <p className="text-sm text-green-400 font-medium">
              ✓ {message}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p className="text-sm text-red-400 font-medium">
              {message}
            </p>
          </div>
        )}

        {status === 'idle' && (
          <div className="text-center">
            <p className="text-xs sm:text-sm text-brand-200/90 font-medium">
              No apto para sensibles.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}

