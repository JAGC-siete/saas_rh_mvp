import { AuthProvider } from '../lib/auth'
import { NotificationProvider } from './NotificationProvider'
import { ToastContainer } from '../lib/toast'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

const SessionExpiryWarning = dynamic(
  () => import('./SessionExpiryWarning').then((m) => m.SessionExpiryWarning),
  { ssr: false }
)

/**
 * Authenticated / legacy app shell — dynamically imported from _app so marketing
 * routes never download Auth + Notification + Supabase realtime bootstrap.
 */
export default function AppAuthenticatedProviders({
  children,
  showSessionWarning,
}: {
  children: ReactNode
  showSessionWarning: boolean
}) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        {showSessionWarning && (
          <SessionExpiryWarning
            onExpiry={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/app/login'
              }
            }}
          />
        )}
        <ToastContainer />
      </NotificationProvider>
    </AuthProvider>
  )
}
