import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import ReportsAndAnalytics from '../../components/ReportsAndAnalytics'

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
            <p className="text-gray-600">Genera reportes y análisis de datos</p>
          </div>
          
          <ReportsAndAnalytics />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
