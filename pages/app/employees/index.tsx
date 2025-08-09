import dynamic from 'next/dynamic'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'

// Carga diferida sin cambiar interfaz pública
const EmployeeManager = dynamic(
  () => import('../../../components/EmployeeManager'),
  {
    // mantenemos SSR para no cambiar comportamiento; sólo code-splitting
    ssr: true,
    loading: () => (
      <div className="text-gray-300" role="status" aria-live="polite">
        Cargando gestor de empleados…
      </div>
    ),
  }
)

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestión de Empleados</h1>
            <p className="text-gray-300">Administra la información de los empleados</p>
          </div>
          
          <EmployeeManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
