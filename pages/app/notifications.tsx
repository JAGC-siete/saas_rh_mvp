import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Button } from '../../components/ui/button'
import NotificationInbox from '../../components/ui/NotificationInbox'
import { useNotificationContext } from '../../components/NotificationProvider'

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotificationContext()

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
              <p className="text-sm text-gray-400">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="bg-white/5 border-white/10 hover:bg-white/10"
                disabled={unreadCount === 0}
                onClick={markAllAsRead}
              >
                Marcar todas como leídas
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 hover:bg-white/10"
                disabled={notifications.length === 0}
                onClick={clearAll}
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <NotificationInbox notifications={notifications} maxItems={1000} />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

