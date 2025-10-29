/**
 * Session Expiry Warning Component
 * Shows warning at 80 minutes (10 min before 90 min timeout)
 */

import React, { useState, useEffect } from 'react'

interface SessionExpiryWarningProps {
  onExpiry?: () => void
}

export function SessionExpiryWarning({ onExpiry }: SessionExpiryWarningProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let timeout: NodeJS.Timeout | null = null

    async function checkSessionExpiry() {
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
          }
        }
      } catch (error) {
        console.error('Error checking session expiry', error)
      }
    }

    // Check immediately
    checkSessionExpiry()

    // Set up interval to check every 5 minutes
    interval = setInterval(checkSessionExpiry, 5 * 60 * 1000)

    // Cleanup
    return () => {
      if (interval) clearInterval(interval)
      if (timeout) clearTimeout(timeout)
    }
  }, [onExpiry, isDismissed])

  const handleKeepSession = async () => {
    try {
      // Make a valid authenticated request to update activity
      await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      setShowWarning(false)
      setIsDismissed(true)
      
      // Reset dismissed state after 5 minutes
      setTimeout(() => setIsDismissed(false), 5 * 60 * 1000)
    } catch (error) {
      console.error('Error keeping session active', error)
    }
  }

  const handleDismiss = () => {
    setShowWarning(false)
    setIsDismissed(true)
    
    // Reset dismissed state after 10 minutes
    setTimeout(() => setIsDismissed(false), 10 * 60 * 1000)
  }

  if (!showWarning) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-lg z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Tu sesión expirará pronto</strong>
            {minutesLeft !== null && (
              <span className="block mt-1">
                Tu sesión se cerrará por inactividad en {minutesLeft} minutos.
              </span>
            )}
          </p>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleKeepSession}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition"
            >
              Mantener sesión
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-transparent hover:bg-yellow-100 rounded transition"
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