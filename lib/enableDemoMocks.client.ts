/**
 * Client-only MSW enabler for demo mode
 * DISABLED: Using real API endpoints instead
 */

'use client'

// Global flag to prevent multiple MSW starts
declare global { 
  interface Window { 
    __msw_started?: boolean 
  } 
}

export async function enableDemoMocks() {
  // Guard: only in browser
  if (typeof window === 'undefined') {
    console.log('🔧 enableDemoMocks: not in browser, skipping')
    return
  }

  // Guard: only in demo routes
  if (!window.location.pathname.startsWith('/app/demo')) {
    console.log('🔧 enableDemoMocks: not in demo mode, skipping')
    return
  }

  // MSW DISABLED - using real demo API endpoints instead
  console.log('🔧 enableDemoMocks: MSW disabled, using real demo endpoints')
  window.__msw_started = true
}
