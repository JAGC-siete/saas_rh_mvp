import React, { createContext } from 'react'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { AuthProvider } from '../lib/auth'
import { NotificationProvider } from '../components/NotificationProvider'
import { SessionExpiryWarning } from '../components/SessionExpiryWarning'
import { ToastContainer } from '../lib/toast'
import { cn } from '../lib/utils'
import { isPublicMarketingRoute } from '../lib/seo/public-ssr-routes'
import '../styles/globals.css'
import '../styles/landing.css'
import '../styles/landing-liquid.css'
import '../styles/paz-landing.css'
import '../styles/viernes-landing.css'
import '../styles/activar-landing.css'

// Load environment variables at the top level
if (typeof window === 'undefined') {
  // Server-side: load environment variables
  require('dotenv').config()
}

// Create a context for Supabase client (using new SSR client)
export const SupabaseContext = createContext<any>(null)

export default function App({ Component, pageProps }: AppProps) {
  const [isClient, setIsClient] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const isMeshAppRoute =
    router.pathname.startsWith('/app') &&
    router.pathname !== '/app/login' &&
    router.pathname !== '/app/forgot-password'

  const isAuthEntryRoute =
    router.pathname === '/app/login' || router.pathname === '/app/forgot-password'

  // SSR completo solo en landings SEO; shell /app y rutas legacy esperan hidratación.
  const shouldRenderImmediately =
    isPublicMarketingRoute(router.pathname) || isAuthEntryRoute

  const needsClientHydrationGate = !shouldRenderImmediately

  if (needsClientHydrationGate && !isClient) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', !isMeshAppRoute && 'bg-app')}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <SupabaseContext.Provider value={null}>
      <AuthProvider>
        <NotificationProvider>
          <div className={cn('min-h-screen', !isMeshAppRoute && 'bg-app')}>
            {/* Title tags are now handled by individual pages to avoid duplication */}
            <Component {...pageProps} />
            {/* Idle Timeout Warning - Shows at 80 minutes of inactivity */}
            {router.pathname.startsWith('/app') && (
              <SessionExpiryWarning
                onExpiry={() => {
                  // Redirect to login on session expiry
                  if (typeof window !== 'undefined') {
                    window.location.href = '/app/login'
                  }
                }}
              />
            )}
            <ToastContainer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </SupabaseContext.Provider>
  )
}
