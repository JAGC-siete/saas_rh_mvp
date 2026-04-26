export type NotificationModule =
  | 'leave'
  | 'attendance'
  | 'payroll'
  | 'admin'
  | 'gamification'
  | 'system'

export type AppNotificationType = 'success' | 'error' | 'warning' | 'info'

export interface ActionableCTA {
  type: 'approve' | 'reject' | 'view'
  label: string
  handler: (notificationId: string) => Promise<void> | void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export interface AppNotification {
  id: string
  type: AppNotificationType
  title: string
  message: string
  module?: NotificationModule
  createdAt: Date
  read: boolean
  duration?: number
  link?: string
  cta?: ActionableCTA[]
  metadata?: Record<string, unknown>
}

