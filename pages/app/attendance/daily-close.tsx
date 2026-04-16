import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import DailyClosePanel from '../../../components/attendance/DailyClosePanel'

/**
 * Pantalla de cierre de día (accesible desde Attendance).
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
