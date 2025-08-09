import dynamic from 'next/dynamic'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'

// Code-splitting para mejor performance
const ReportsAndAnalytics = dynamic(
  () => import('../../../components/ReportsAndAnalytics'),
  {
    ssr: true,
    loading: () => (
      <div className="text-gray-300" role="status" aria-live="polite">
        Cargando gestor de reportes…
      </div>
    ),
  }
)

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 Reportes de Asistencia</h1>
            <p className="text-gray-300">Genera reportes detallados de asistencia en formato PDF o CSV</p>
          </div>
          
          <ReportsAndAnalytics />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
