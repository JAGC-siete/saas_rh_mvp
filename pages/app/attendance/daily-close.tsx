import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import DailyClosePanel from '../../../components/attendance/DailyClosePanel'

/**
 * Cierre del día: revisión de marcas, ajustes y cálculo de horas normales y extras.
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
