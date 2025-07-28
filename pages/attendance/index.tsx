import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import AttendanceManager from '../../components/AttendanceManager'

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
            <p className="text-gray-600">Administra el registro de asistencia</p>
          </div>
          
          <AttendanceManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
