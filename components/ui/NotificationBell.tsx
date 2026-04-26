import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from './badge'
import { Button } from './button'
import NotificationInbox from './NotificationInbox'
import { useNotificationContext } from '../NotificationProvider'

export default function NotificationBell({ className }: { className?: string }) {
  const { notifications, unreadCount, markAllAsRead } = useNotificationContext()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notificaciones"
        className="relative h-9 w-9 rounded-full hover:bg-white/10"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5 text-white" aria-hidden />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-0 flex items-center justify-center text-[10px] font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="region"
            aria-label="Centro de notificaciones"
            className="absolute right-0 mt-2 z-50 w-[380px] rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="font-semibold text-white">Notificaciones</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-gray-300 hover:text-white"
                  onClick={() => {
                    markAllAsRead()
                    setOpen(false)
                  }}
                >
                  Marcar todas
                </Button>
              )}
            </div>

            <div aria-live="polite">
              <NotificationInbox notifications={notifications} maxItems={8} onClose={() => setOpen(false)} />
            </div>

            <div className="border-t border-white/10 p-2 text-center">
              <Button variant="link" size="sm" asChild className="text-xs">
                <Link href="/app/notifications" onClick={() => setOpen(false)}>
                  Ver todas
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

