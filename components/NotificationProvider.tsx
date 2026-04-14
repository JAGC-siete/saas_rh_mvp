import React, { createContext, useContext } from 'react'
import { useNotifications, type AddNotificationInput, Notification } from '../lib/hooks/useNotifications'
import NotificationToast from './NotificationToast'

interface NotificationContextType {
  notifications: Notification[]
  // eslint-disable-next-line no-unused-vars
  addNotification: (notification: AddNotificationInput) => string
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

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, markAsRead, markAllAsRead, unreadCount, filteredNotifications, clearAll }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
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
