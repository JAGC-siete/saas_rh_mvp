import dynamic from 'next/dynamic'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'

// Code-splitting para mejor performance
const PayrollManager = dynamic(
  () => import('../../../components/PayrollManager'),
  {
    ssr: true,
    loading: () => (
      <div className="text-gray-300" role="status" aria-live="polite">
        Cargando gestor de nómina…
      </div>
    ),
  }
)

export default function PayrollPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestión de Nómina</h1>
            <p className="text-gray-300">Procesa y administra las nóminas</p>
          </div>
          
          <PayrollManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
