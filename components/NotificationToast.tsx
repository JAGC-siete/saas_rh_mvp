import React from 'react'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { Notification } from '../lib/hooks/useNotifications'

interface NotificationToastProps {
  notification: Notification
  // eslint-disable-next-line no-unused-vars
  onRemove: (id: string) => void
}

function formatToastMessage(input: unknown): string {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as any
        if (parsed && typeof parsed === 'object') {
          const candidates = [parsed.message, parsed.error, parsed.details, parsed.hint].filter(
            (v) => typeof v === 'string' && v.trim().length > 0
          ) as string[]
          if (candidates.length > 0) return candidates.join('\n')
        }
      } catch {
        // fall through: keep original string
      }
    }
    return input
  }

  if (input instanceof Error) return input.message
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

const iconMap = {
  success: CheckCircleIcon,
  error: ExclamationTriangleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
}

const colorMap = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-black',
  info: 'bg-blue-500 text-white'
}

export default function NotificationToast({ notification, onRemove }: NotificationToastProps) {
  const Icon = iconMap[notification.type]
  const colorClass = colorMap[notification.type]
  const message = formatToastMessage(notification.message)

  return (
    <div className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${colorClass}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">
              {notification.title}
            </p>
            <p className="mt-1 text-sm opacity-90 whitespace-pre-wrap break-words max-h-32 overflow-auto">
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="rounded-md inline-flex hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              onClick={() => onRemove(notification.id)}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
