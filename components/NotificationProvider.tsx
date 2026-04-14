import React, { createContext, useContext } from 'react'
import { useNotifications, Notification } from '../lib/hooks/useNotifications'
import NotificationToast from './NotificationToast'

interface NotificationContextType {
  // eslint-disable-next-line no-unused-vars
  addNotification: (notification: Omit<Notification, 'id'>) => string
  // eslint-disable-next-line no-unused-vars
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications, addNotification, removeNotification, clearAll } = useNotifications()

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, clearAll }}>
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
