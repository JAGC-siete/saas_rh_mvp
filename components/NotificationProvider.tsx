import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useNotifications, type AddNotificationInput, Notification } from '../lib/hooks/useNotifications'
import NotificationToast from './NotificationToast'
import { useAuth } from '../lib/auth'
import { createClient } from '../lib/supabase/client'

export interface NotificationContextType {
  notifications: Notification[]
  // eslint-disable-next-line no-unused-vars
  addNotification: (notification: AddNotificationInput) => string | null
  // eslint-disable-next-line no-unused-vars
  removeNotification: (id: string) => void
  // eslint-disable-next-line no-unused-vars
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  unreadCount: number
   
  filteredNotifications: ReturnType<typeof useNotifications>['filteredNotifications']
  clearAll: () => void
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications, addNotification, removeNotification, markAsRead, markAllAsRead, unreadCount, filteredNotifications, clearAll } = useNotifications()
  const { userProfile } = useAuth()

  const role = (userProfile?.role || '').toString().trim().toLowerCase()
  const isManager = useMemo(() => ['company_admin', 'hr_manager', 'manager', 'super_admin'].includes(role), [role])
  const lastEventRef = useRef<{ key: string; ts: number } | null>(null)

  useEffect(() => {
    if (!userProfile?.company_id) return

    let unsubscribed = false
    let channel: any = null

    const start = async () => {
      try {
        const supabase = createClient()
        // Subscribe to inserts scoped by company_id; RLS will filter rows per user.
        channel = supabase
          .channel(`app_notifications_${userProfile.company_id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'app_notifications',
              filter: `company_id=eq.${userProfile.company_id}`,
            },
            (payload: any) => {
              if (unsubscribed) return
              const row = payload?.new
              if (!row) return

              // Defensive UX filter: managers see company-wide + their own; employees see only their own.
              if (!isManager) {
                const myEmployeeId = userProfile.employee_id
                if (!myEmployeeId) return
                if (row.employee_id && row.employee_id !== myEmployeeId) return
                if (row.employee_id == null) return
              }

              const createdAt = row.created_at ? new Date(row.created_at) : new Date()
              const dedupeKey = `${row.id || ''}|${row.title || ''}|${row.message || ''}`
              const now = Date.now()
              const last = lastEventRef.current
              if (last && last.key === dedupeKey && now - last.ts < 1500) return
              lastEventRef.current = { key: dedupeKey, ts: now }

              addNotification({
                type: row.type || 'info',
                title: row.title || 'Notificación',
                message: row.message || '',
                module: row.module,
                metadata: row.metadata,
                createdAt,
                read: false,
                duration: 8000,
              })
            }
          )
          .subscribe()
      } catch {
        // If env/auth isn't ready yet, just skip realtime notifications.
      }
    }

    void start()

    return () => {
      unsubscribed = true
      try {
        channel?.unsubscribe?.()
      } catch {
        // ignore
      }
    }
  }, [userProfile?.company_id, userProfile?.employee_id, isManager, addNotification, userProfile?.role])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, markAsRead, markAllAsRead, unreadCount, filteredNotifications, clearAll }}>
      {children}
      <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}
