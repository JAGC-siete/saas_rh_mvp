import React, { createContext } from 'react'
import { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { Montserrat } from 'next/font/google'
import { ToastContainer } from '../lib/toast'
import { cn } from '../lib/utils'
import { isPublicMarketingRoute } from '../lib/seo/public-ssr-routes'
import MarketingAnalytics from '../components/marketing/MarketingAnalytics'
import '../styles/globals.css'

const AppAuthenticatedProviders = dynamic(
  () => import('../components/AppAuthenticatedProviders'),
  { ssr: true }
)

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-montserrat',
})

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

  const isMarketingRoute = isPublicMarketingRoute(router.pathname)

  // SSR completo solo en landings SEO; shell /app y rutas legacy esperan hidratación.
  const shouldRenderImmediately = isMarketingRoute || isAuthEntryRoute

  const needsClientHydrationGate = !shouldRenderImmediately

  if (needsClientHydrationGate && !isClient) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', !isMeshAppRoute && 'bg-app')}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  const page = (
    <div className={cn(montserrat.variable, 'min-h-screen font-sans', !isMeshAppRoute && !isMarketingRoute && 'bg-app')}>
      <Component {...pageProps} />
    </div>
  )

  // Marketing: skip Auth/Notification (unused JS + main-thread) and load analytics late.
  if (isMarketingRoute) {
    return (
      <SupabaseContext.Provider value={null}>
        {page}
        <ToastContainer />
        <MarketingAnalytics />
      </SupabaseContext.Provider>
    )
  }

  return (
    <SupabaseContext.Provider value={null}>
      <AppAuthenticatedProviders showSessionWarning={router.pathname.startsWith('/app')}>
        {page}
      </AppAuthenticatedProviders>
    </SupabaseContext.Provider>
  )
}
