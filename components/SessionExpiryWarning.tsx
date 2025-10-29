/**
 * Session Expiry Warning Component
 * Shows warning at 80 minutes of inactivity (10 min before 90 min timeout)
 * 
 * Based on: https://supabase.com/docs/guides/auth/sessions
 */

import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw, X } from 'lucide-react'

interface SessionExpiryWarningProps {
  minutesUntilExpiry: number
  onExtendSession: () => Promise<void>
}

export default function SessionExpiryWarning({ minutesUntilExpiry, onExtendSession }: SessionExpiryWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Show warning when less than 10 minutes remain
  useEffect(() => {
    if (minutesUntilExpiry <= 10 && minutesUntilExpiry > 0) {
      setIsVisible(true)
      setIsDismissed(false)
    } else {
      setIsVisible(false)
    }
  }, [minutesUntilExpiry])

  const handleExtendSession = async () => {
    setIsExtending(true)
    try {
      await onExtendSession()
      setIsVisible(false)
    } catch (error) {
      console.error('Error extending session:', error)
    } finally {
      setIsExtending(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  if (!isVisible || isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-xl p-4 max-w-md">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-1">
              Tu sesión está por expirar
            </h3>
            <p className="text-sm text-yellow-800 mb-3">
              Has estado inactivo. Tu sesión expirará en <strong>{Math.ceil(minutesUntilExpiry)} minutos</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExtendSession}
                disabled={isExtending}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isExtending ? 'animate-spin' : ''}`} />
                {isExtending ? 'Extendiendo...' : 'Mantener sesión'}
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="h-4 w-4 text-yellow-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to monitor session expiry
 * Calls heartbeat every 5 minutes and shows warning at 10 min remaining
 */
export function useSessionExpiryMonitor(onExpiry: () => void) {
  const [minutesUntilExpiry, setMinutesUntilExpiry] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!isActive) return

    let heartbeatInterval: NodeJS.Timeout
    let warningCheckInterval: NodeJS.Timeout

    // Heartbeat: update session activity every 5 minutes
    const startHeartbeat = async () => {
      const sendHeartbeat = async () => {
        try {
          const response = await fetch('/api/auth/heartbeat', {
            method: 'POST',
            credentials: 'include'
          })

          if (response.status === 440) {
            // Session expired
            onExpiry()
            setIsActive(false)
            return
          }

          if (response.ok) {
            const data = await response.json()
            setMinutesUntilExpiry(data.idleTimeoutMinutes)
          }
        } catch (error) {
          console.error('Heartbeat error:', error)
        }
      }

      // Send immediately
      await sendHeartbeat()

      // Then every 5 minutes
      heartbeatInterval = setInterval(sendHeartbeat, 5 * 60 * 1000)
    }

    // Check for warning every minute
    const startWarningCheck = () => {
      warningCheckInterval = setInterval(() => {
        // Warnings are handled by the warning component
      }, 60 * 1000)
    }

    startHeartbeat()
    startWarningCheck()

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      if (warningCheckInterval) clearInterval(warningCheckInterval)
    }
  }, [isActive, onExpiry])

  const handleExtendSession = async () => {
    try {
      const response = await fetch('/api/auth/heartbeat', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setMinutesUntilExpiry(data.idleTimeoutMinutes)
      }
    } catch (error) {
      console.error('Error extending session:', error)
      throw error
    }
  }

  return {
    minutesUntilExpiry,
    isActive,
    setIsActive,
    handleExtendSession
  }
}

