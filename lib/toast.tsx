import React from 'react'

// Simple Toast Notification System
// Provides user feedback for payroll actions

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
  timestamp: Date
}

class ToastManager {
  private static instance: ToastManager
  private toasts: Toast[] = []
  private listeners: ((toasts: Toast[]) => void)[] = []

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager()
    }
    return ToastManager.instance
  }

  // Add a new toast
  addToast(type: ToastType, title: string, message: string, duration: number = 5000): string {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: new Date()
    }

    this.toasts.push(toast)
    this.notifyListeners()

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id)
      }, duration)
    }

    return id
  }

  // Remove a specific toast
  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id)
    this.notifyListeners()
  }

  // Clear all toasts
  clearAll(): void {
    this.toasts = []
    this.notifyListeners()
  }

  // Subscribe to toast changes
  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }

  // Convenience methods
  success(title: string, message: string, duration?: number): string {
    return this.addToast('success', title, message, duration)
  }

  error(title: string, message: string, duration?: number): string {
    return this.addToast('error', title, message, duration)
  }

  warning(title: string, message: string, duration?: number): string {
    return this.addToast('warning', title, message, duration)
  }

  info(title: string, message: string, duration?: number): string {
    return this.addToast('info', title, message, duration)
  }
}

export const toastManager = ToastManager.getInstance()

// React Hook for using toasts
export const useToast = () => {
  return {
    success: (title: string, message: string, duration?: number) => 
      toastManager.success(title, message, duration),
    error: (title: string, message: string, duration?: number) => 
      toastManager.error(title, message, duration),
    warning: (title: string, message: string, duration?: number) => 
      toastManager.warning(title, message, duration),
    info: (title: string, message: string, duration?: number) => 
      toastManager.info(title, message, duration),
    remove: (id: string) => toastManager.removeToast(id),
    clearAll: () => toastManager.clearAll()
  }
}

// Simple Icon component for toasts
const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const icons: Record<string, string> = {
    'check-circle': '✓',
    'x-circle': '✕',
    'alert-triangle': '⚠',
    'info': 'ℹ',
    'x': '×'
  }
  
  return (
    <span className={className}>
      {icons[name] || '•'}
    </span>
  )
}

// Toast Component (can be used in your app)
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  React.useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts)
    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
            toast.type === 'success' ? 'border-l-4 border-green-400' :
            toast.type === 'error' ? 'border-l-4 border-red-400' :
            toast.type === 'warning' ? 'border-l-4 border-yellow-400' :
            'border-l-4 border-blue-400'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {toast.type === 'success' && (
                  <Icon name="check-circle" className="h-6 w-6 text-green-400" />
                )}
                {toast.type === 'error' && (
                  <Icon name="x-circle" className="h-6 w-6 text-red-400" />
                )}
                {toast.type === 'warning' && (
                  <Icon name="alert-triangle" className="h-6 w-6 text-yellow-400" />
                )}
                {toast.type === 'info' && (
                  <Icon name="info" className="h-6 w-6 text-blue-400" />
                )}
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-gray-900">{toast.title}</p>
                <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => toastManager.removeToast(toast.id)}
                >
                  <span className="sr-only">Close</span>
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
