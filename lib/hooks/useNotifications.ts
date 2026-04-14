import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import type { AppNotification, AppNotificationType, NotificationModule } from '../../types/notification'

export type Notification = AppNotification

export interface AddNotificationInput {
  type: AppNotificationType
  title: string
  message: string
  module?: NotificationModule
  duration?: number
  link?: string
  cta?: AppNotification['cta']
  metadata?: AppNotification['metadata']
  read?: boolean
  createdAt?: Date
}

const MAX_NOTIFICATIONS = 50
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 3
const rateLimitMap = new Map<string, number[]>()

function rateLimitKey(module: NotificationModule | undefined, type: AppNotificationType) {
  return `${module || 'general'}:${type}`
}

function isRateLimited(module: NotificationModule | undefined, type: AppNotificationType): boolean {
  const key = rateLimitKey(module, type)
  const now = Date.now()
  const timestamps = rateLimitMap.get(key) || []
  const valid = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  if (valid.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(key, valid)
    return true
  }
  valid.push(now)
  rateLimitMap.set(key, valid)
  return false
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    const t = timeoutsRef.current.get(id)
    if (t) {
      clearTimeout(t)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const addNotification = useCallback((notification: AddNotificationInput) => {
    if (isRateLimited(notification.module, notification.type)) {
      return null
    }

    const id = Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      module: notification.module,
      duration: notification.duration,
      link: notification.link,
      cta: notification.cta,
      metadata: notification.metadata,
      read: notification.read ?? false,
      createdAt: notification.createdAt ?? new Date(),
    }
    
    setNotifications((prev) => {
      const dup = prev.find((n) => {
        if (n.read) return false
        if (n.type !== newNotification.type) return false
        if (n.module !== newNotification.module) return false
        if (n.title !== newNotification.title) return false
        const prevRequestId = (n.metadata as any)?.requestId
        const nextRequestId = (newNotification.metadata as any)?.requestId
        if (prevRequestId || nextRequestId) return prevRequestId === nextRequestId
        return n.message === newNotification.message
      })

      if (dup) {
        return prev.map((n) => (n.id === dup.id ? { ...n, createdAt: newNotification.createdAt } : n))
      }

      return [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS)
    })
    
    // Auto remove after duration (default 5 seconds)
    const duration = typeof notification.duration === 'number' ? notification.duration : 5000
    if (duration > 0) {
      const t = setTimeout(() => {
        removeNotification(id)
      }, duration)
      timeoutsRef.current.set(id, t)
    }
    
    return id
  }, [removeNotification])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    timeoutsRef.current.forEach((t) => clearTimeout(t))
    timeoutsRef.current.clear()
  }, [])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const filteredNotifications = useCallback(
    (filter: { scope: 'all' } | { scope: 'unread' } | { scope: 'module'; module: NotificationModule }) => {
      if (filter.scope === 'unread') return notifications.filter(n => !n.read)
      if (filter.scope === 'module') return notifications.filter(n => n.module === filter.module)
      return notifications
    },
    [notifications]
  )

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t))
      timeoutsRef.current.clear()
    }
  }, [])

  return {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
    filteredNotifications,
    clearAll
  }
}
