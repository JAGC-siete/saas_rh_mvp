/**
 * MSW Browser setup para el Demo de Humano SISU
 * Se inicializa solo en rutas /app/demo* - SOLO EN BROWSER
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

const isBrowser = typeof window !== 'undefined'

// NO ejecutes setupWorker en SSR
export const worker = isBrowser ? setupWorker(...handlers) : null

// Helper to check if we're in demo mode
export const isInDemo = () => {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/app/demo')
}

// Start MSW only in demo routes - DEPRECATED: usar enableDemoMocks en su lugar
export const startMSW = async () => {
  console.warn('startMSW is deprecated, use enableDemoMocks instead')
  if (!isBrowser || !worker) {
    console.log('🔧 Not in browser or worker not available, skipping MSW setup')
    return
  }

  if (!isInDemo()) {
    console.log('🔧 Not in demo mode, skipping MSW setup')
    return
  }

  try {
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
    console.log('✅ MSW started successfully for demo')
  } catch (error) {
    console.error('❌ Failed to start MSW for demo:', error)
  }
}

// Stop MSW (if needed)
export const stopMSW = () => {
  if (worker) {
    worker.stop()
    console.log('🛑 MSW stopped')
  }
}
