/**
 * MSW Browser setup para el Demo de Humano SISU
 * DISABLED: Using real API endpoints instead of MSW
 */

const isBrowser = typeof window !== 'undefined'

// MSW DISABLED - using real demo API endpoints instead
export const worker = null

// Helper to check if we're in demo mode
export const isInDemo = () => {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/app/demo')
}

// MSW functions disabled
export const startMSW = async () => {
  console.log('🔧 MSW disabled - using real demo API endpoints')
}

export const stopMSW = () => {
  console.log('🔧 MSW disabled - using real demo API endpoints')
}
