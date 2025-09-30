import { createClient } from '../supabase/client'

interface NotificationData {
  id: string
  type: 'achievement' | 'score_update' | 'leaderboard_change' | 'point_earned'
  title: string
  message: string
  data: any
  timestamp: string
  read: boolean
  employeeId?: string
  companyId: string
}

interface NotificationConfig {
  companyId: string
  employeeId?: string
  onNotification?: (notification: NotificationData) => void
  maxNotifications?: number
}

export class RealtimeNotificationManager {
  private supabase = createClient()
  private notifications: NotificationData[] = []
  private listeners: ((notification: NotificationData) => void)[] = []
  private config: NotificationConfig
  private channel: any = null
  private maxNotifications: number

  constructor(config: NotificationConfig) {
    this.config = config
    this.maxNotifications = config.maxNotifications || 50
    this.setupRealtimeListeners()
  }

  private setupRealtimeListeners() {
    if (!this.config.companyId) {
      console.warn('RealtimeNotificationManager: companyId is required')
      return
    }

    const channelName = `notifications_${this.config.companyId}`
    
    this.channel = this.supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'employee_achievements',
        filter: `company_id=eq.${this.config.companyId}`
      }, (payload) => {
        this.handleAchievementNotification(payload.new)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'point_history',
        filter: `company_id=eq.${this.config.companyId}`
      }, (payload) => {
        this.handlePointHistoryNotification(payload.new)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'employee_scores',
        filter: `company_id=eq.${this.config.companyId}`
      }, (payload) => {
        this.handleScoreUpdateNotification(payload.new)
      })
      .subscribe((status) => {
        console.log('🔔 Notification channel status:', status)
      })
  }

  private handleAchievementNotification(achievement: any) {
    // Only show notifications for the specific employee if employeeId is provided
    if (this.config.employeeId && achievement.employee_id !== this.config.employeeId) {
      return
    }

    const notification: NotificationData = {
      id: `achievement_${achievement.id}_${Date.now()}`,
      type: 'achievement',
      title: '¡Nuevo Logro Desbloqueado!',
      message: `Has ganado ${achievement.points_earned} puntos`,
      data: achievement,
      timestamp: new Date().toISOString(),
      read: false,
      employeeId: achievement.employee_id,
      companyId: achievement.company_id
    }

    this.addNotification(notification)
  }

  private handlePointHistoryNotification(pointHistory: any) {
    // Only show notifications for the specific employee if employeeId is provided
    if (this.config.employeeId && pointHistory.employee_id !== this.config.employeeId) {
      return
    }

    const notification: NotificationData = {
      id: `point_${pointHistory.id}_${Date.now()}`,
      type: 'point_earned',
      title: 'Puntos Ganados',
      message: `+${pointHistory.points_earned} puntos por ${pointHistory.reason}`,
      data: pointHistory,
      timestamp: new Date().toISOString(),
      read: false,
      employeeId: pointHistory.employee_id,
      companyId: pointHistory.company_id
    }

    this.addNotification(notification)
  }

  private handleScoreUpdateNotification(scoreUpdate: any) {
    // Only show notifications for the specific employee if employeeId is provided
    if (this.config.employeeId && scoreUpdate.employee_id !== this.config.employeeId) {
      return
    }

    const notification: NotificationData = {
      id: `score_${scoreUpdate.employee_id}_${Date.now()}`,
      type: 'score_update',
      title: 'Puntuación Actualizada',
      message: `Total: ${scoreUpdate.total_points} puntos`,
      data: scoreUpdate,
      timestamp: new Date().toISOString(),
      read: false,
      employeeId: scoreUpdate.employee_id,
      companyId: scoreUpdate.company_id
    }

    this.addNotification(notification)
  }

  private addNotification(notification: NotificationData) {
    // Add to beginning of array
    this.notifications.unshift(notification)
    
    // Keep only the latest notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications)
    }

    // Notify listeners
    this.notifyListeners(notification)
    
    // Call external callback if provided
    this.config.onNotification?.(notification)
  }

  public subscribe(listener: (notification: NotificationData) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(notification: NotificationData) {
    this.listeners.forEach(listener => {
      try {
        listener(notification)
      } catch (error) {
        console.error('Error in notification listener:', error)
      }
    })
  }

  public getNotifications(): NotificationData[] {
    return [...this.notifications]
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  public markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  public markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true
    })
  }

  public clearNotifications() {
    this.notifications = []
  }

  public clearOldNotifications(olderThanHours: number = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    this.notifications = this.notifications.filter(
      notification => new Date(notification.timestamp) > cutoffTime
    )
  }

  public destroy() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.listeners = []
    this.notifications = []
  }
}

// Singleton instances for different contexts
const notificationManagers = new Map<string, RealtimeNotificationManager>()

export function getNotificationManager(config: NotificationConfig): RealtimeNotificationManager {
  const key = `${config.companyId}_${config.employeeId || 'all'}`
  
  if (!notificationManagers.has(key)) {
    const manager = new RealtimeNotificationManager(config)
    notificationManagers.set(key, manager)
  }
  
  return notificationManagers.get(key)!
}

export function destroyNotificationManager(companyId: string, employeeId?: string) {
  const key = `${companyId}_${employeeId || 'all'}`
  const manager = notificationManagers.get(key)
  
  if (manager) {
    manager.destroy()
    notificationManagers.delete(key)
  }
}

// Utility function to create notification for testing
export function createTestNotification(
  type: NotificationData['type'],
  title: string,
  message: string,
  companyId: string,
  employeeId?: string
): NotificationData {
  return {
    id: `test_${Date.now()}`,
    type,
    title,
    message,
    data: { test: true },
    timestamp: new Date().toISOString(),
    read: false,
    employeeId,
    companyId
  }
}
