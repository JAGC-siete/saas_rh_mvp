import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import DailyClosePanel from '../../../components/attendance/DailyClosePanel'

/**
 * Pantalla Control de horas extras / cierre operativo del día (desde Attendance).
 */
export default function AttendanceDailyCloseRedirectPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <DailyClosePanel variant="page" />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
