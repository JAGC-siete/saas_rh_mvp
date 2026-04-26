import Link from 'next/link'
import React, { useMemo } from 'react'
import { Check, CheckCircle2, AlertTriangle, Eye, Info, X, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import type { Notification } from '../../lib/hooks/useNotifications'
import { useNotificationContext } from '../NotificationProvider'

function typeIcon(type: Notification['type']) {
  switch (type) {
    case 'success':
      return CheckCircle2
    case 'error':
      return XCircle
    case 'warning':
      return AlertTriangle
    case 'info':
    default:
      return Info
  }
}

function typeColor(type: Notification['type']) {
  switch (type) {
    case 'success':
      return 'text-emerald-300'
    case 'error':
      return 'text-red-300'
    case 'warning':
      return 'text-amber-300'
    case 'info':
    default:
      return 'text-sky-300'
  }
}

export default function NotificationInbox({
  notifications,
  maxItems = 8,
  onClose,
}: {
  notifications: Notification[]
  maxItems?: number
  onClose?: () => void
}) {
  const { markAsRead } = useNotificationContext()

  const items = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return sorted.slice(0, Math.max(0, maxItems))
  }, [notifications, maxItems])

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-400">
        No hay notificaciones.
      </div>
    )
  }

  return (
    <div className="max-h-[420px] overflow-auto">
      <ul className="divide-y divide-white/10">
        {items.map((n) => {
          const Icon = typeIcon(n.type)
          const row = (
            <div
              className={cn(
                'flex gap-3 px-4 py-3 transition-colors',
                n.read ? 'opacity-70' : 'opacity-100',
                'hover:bg-white/5'
              )}
            >
              <div className={cn('mt-0.5 shrink-0', typeColor(n.type))}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                  <p className="text-[11px] text-gray-400 shrink-0">
                    {n.createdAt.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-gray-300 line-clamp-2">{n.message}</p>
                {Array.isArray(n.cta) && n.cta.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.cta.slice(0, 3).map((cta, idx) => (
                      <Button
                        key={`${n.id}-cta-${idx}`}
                        type="button"
                        size="sm"
                        variant={cta.variant || 'outline'}
                        className="h-8 border-white/10 bg-white/5 hover:bg-white/10"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          try {
                            await cta.handler(n.id)
                          } finally {
                            markAsRead(n.id)
                            onClose?.()
                          }
                        }}
                      >
                        {cta.type === 'approve' && <Check className="h-3.5 w-3.5 mr-1" aria-hidden />}
                        {cta.type === 'reject' && <X className="h-3.5 w-3.5 mr-1" aria-hidden />}
                        {cta.type === 'view' && <Eye className="h-3.5 w-3.5 mr-1" aria-hidden />}
                        {cta.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )

          const handleOpen = () => {
            markAsRead(n.id)
            onClose?.()
          }

          return (
            <li key={n.id}>
              {n.link ? (
                <Link
                  href={n.link}
                  className="block focus:outline-none focus:ring-2 focus:ring-brand-400/60"
                  onClick={handleOpen}
                >
                  {row}
                </Link>
              ) : (
                <button
                  type="button"
                  className="w-full text-left focus:outline-none focus:ring-2 focus:ring-brand-400/60"
                  onClick={handleOpen}
                >
                  {row}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

