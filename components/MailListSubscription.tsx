import { useState } from 'react'
import { Button } from './ui/button'

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
      const response = await fetch('/api/mail-list/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          source,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage('¡Perfecto! Revisa tu correo para confirmar tu suscripción.')
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
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-md mx-auto">
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
            placeholder="Tu email"
            disabled={loading}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            required
            aria-label="Email para suscripción"
          />
          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="whitespace-nowrap"
            variant="modern"
          >
            {loading ? 'Enviando...' : 'Suscribirse'}
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
            <p className="text-xs sm:text-sm text-brand-200/60">
              No apto para sensibles.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}

