import { createContext } from 'react'
import type { AddNotificationInput, Notification } from '../lib/hooks/useNotifications'
import type { NotificationModule } from '../types/notification'

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
  filteredNotifications: (
    // eslint-disable-next-line no-unused-vars
    filter: { scope: 'all' } | { scope: 'unread' } | { scope: 'module'; module: NotificationModule }
  ) => Notification[]
  clearAll: () => void
}

/** Thin context module — keeps toast/_app free of Auth + Supabase imports. */
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)
