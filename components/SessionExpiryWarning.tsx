/**
 * Session Expiry Warning Component
 * Shows warning at 80 minutes (10 min before 90 min timeout)
 * Improved UX with progress indicator and better design
 */

import React, { useState, useEffect } from 'react'
import { useActivityDetection } from '../lib/hooks/useActivityDetection'

interface SessionExpiryWarningProps {
  onExpiry?: () => void
}

export function SessionExpiryWarning({ onExpiry }: SessionExpiryWarningProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Detectar actividad del usuario para actualizar sesión automáticamente
  useActivityDetection({
    onActivity: async () => {
      // Solo actualizar si hay actividad y no estamos actualizando
      if (!isUpdating) {
        try {
          await fetch('/api/auth/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (error) {
          // Silently fail - no need to show errors for background updates
        }
      }
    },
    throttleMs: 60000, // Actualizar cada 60 segundos cuando hay actividad
    enabled: true
  })

  const checkSessionExpiry = async () => {
    try {
      const response = await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 440) {
        // Session expired
        setShowWarning(false)
        if (onExpiry) onExpiry()
        return
      }

      if (!response.ok) {
        // Error, but continue monitoring
        return
      }

      const data = await response.json()
      
      if (data.idleTimeoutMinutes !== null && data.idleTimeoutMinutes !== undefined) {
        setMinutesLeft(data.idleTimeoutMinutes)
        
        // Show warning if less than 10 minutes remain (80 minutes of inactivity)
        if (data.idleTimeoutMinutes <= data.warningAt && !isDismissed) {
          setShowWarning(true)
        } else if (data.idleTimeoutMinutes > data.warningAt) {
          // Si tenemos más tiempo, ocultar el warning
          setShowWarning(false)
          setIsDismissed(false)
        }
      }
    } catch (error) {
      console.error('Error checking session expiry', error)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    // Check immediately
    checkSessionExpiry()

    // Set up interval to check every 2 minutes for more responsive updates
    interval = setInterval(checkSessionExpiry, 2 * 60 * 1000)

    // Cleanup
    return () => {
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onExpiry, isDismissed])

  const handleKeepSession = async () => {
    try {
      setIsUpdating(true)
      const response = await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMinutesLeft(data.idleTimeoutMinutes)
        setShowWarning(false)
        setIsDismissed(true)
        
        // Reset dismissed state after 5 minutes
        setTimeout(() => setIsDismissed(false), 5 * 60 * 1000)
      }
    } catch (error) {
      console.error('Error keeping session active', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setShowWarning(false)
    setIsDismissed(true)
    
    // Reset dismissed state after 10 minutes
    setTimeout(() => setIsDismissed(false), 10 * 60 * 1000)
  }

  if (!showWarning) return null

  // Calcular porcentaje de tiempo restante para el indicador de progreso
  const progressPercentage = minutesLeft !== null && minutesLeft <= 10 
    ? (minutesLeft / 10) * 100 
    : 100

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white border-l-4 border-yellow-400 p-4 shadow-xl rounded-lg z-50 animate-slide-up">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100">
            <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            Sesión por expirar
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {minutesLeft !== null && minutesLeft > 0 ? (
              <>
                Tu sesión se cerrará por inactividad en <strong className="text-yellow-600">{minutesLeft} {minutesLeft === 1 ? 'minuto' : 'minutos'}</strong>.
              </>
            ) : (
              'Tu sesión está por expirar.'
            )}
          </p>
          
          {/* Indicador de progreso */}
          {minutesLeft !== null && minutesLeft <= 10 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-yellow-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleKeepSession}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Mantener sesión</span>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to monitor session expiry
 */
export function useSessionExpiryMonitor(onExpiry?: () => void) {
  const [minutesUntilExpiry, setMinutesUntilExpiry] = useState<number | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    async function checkExpiry() {
      try {
        const response = await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.status === 440) {
          // Session expired
          if (onExpiry) onExpiry()
          return
        }

        if (response.ok) {
          const data = await response.json()
          if (data.idleTimeoutMinutes !== null && data.idleTimeoutMinutes !== undefined) {
            setMinutesUntilExpiry(data.idleTimeoutMinutes)
          }
        }
      } catch (error) {
        console.error('Error monitoring session expiry', error)
      }
    }

    // Check immediately
    checkExpiry()

    // Check every 5 minutes
    interval = setInterval(checkExpiry, 5 * 60 * 1000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [onExpiry])

  return { minutesUntilExpiry }
}