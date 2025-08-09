/**
 * Client-only MSW enabler for demo mode
 * SOLO se ejecuta en browser, NUNCA en SSR
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

  // Guard: don't start multiple times
  if (window.__msw_started) {
    console.log('🔧 enableDemoMocks: MSW already started, skipping')
    return
  }

  try {
    console.log('🔧 enableDemoMocks: starting MSW for demo...')
    
    // Dynamic import to avoid SSR issues
    const mod = await import('../mocks/browser')
    
    if (mod.worker) {
      // Start MSW with detailed logging
      await mod.worker.start({ 
        onUnhandledRequest(req, print) {
          // Only warn about unhandled requests that aren't static assets
          if (req.url.includes('/api/') || req.url.includes('/demo-fixtures/')) {
            print.warning()
          }
        },
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
        waitUntilReady: true
      })
      
      // Extra wait to ensure MSW is fully operational
      await new Promise(resolve => setTimeout(resolve, 200))
      
      window.__msw_started = true
      console.log('✅ Demo MSW started successfully and ready to intercept')
      
      // Test that MSW is working
      const testHandlers = await mod.worker.listHandlers()
      console.log(`🔧 MSW handlers loaded: ${testHandlers.length}`)
    } else {
      console.warn('⚠️ MSW worker not available (probably SSR)')
    }
  } catch (error) {
    console.error('❌ Failed to enable demo mocks:', error)
  }
}
