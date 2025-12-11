/**
 * Hook para detectar actividad del usuario
 * Monitorea movimiento de mouse, teclado, scroll, etc.
 */

import { useEffect, useRef, useCallback } from 'react'

interface ActivityDetectionOptions {
  onActivity?: () => void
  throttleMs?: number
  enabled?: boolean
}

export function useActivityDetection(options: ActivityDetectionOptions = {}) {
  const { onActivity, throttleMs = 1000, enabled = true } = options
  const lastActivityRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleActivity = useCallback(() => {
    if (!enabled) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current

    // Throttle: solo llamar onActivity cada throttleMs
    if (timeSinceLastActivity >= throttleMs) {
      lastActivityRef.current = now
      onActivity?.()
    } else {
      // Si aún no ha pasado el throttle, cancelar el timeout anterior y crear uno nuevo
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        lastActivityRef.current = Date.now()
        onActivity?.()
      }, throttleMs - timeSinceLastActivity)
    }
  }, [onActivity, throttleMs, enabled])

  useEffect(() => {
    if (!enabled) return

    // Eventos a monitorear
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]

    // Agregar listeners con throttling
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // También detectar cuando la ventana se vuelve visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleActivity()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Limpieza
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleActivity, enabled])

  return {
    triggerActivity: handleActivity
  }
}
