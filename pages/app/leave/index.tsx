import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import LeaveManager from '../../../components/LeaveManager'

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <header className="border-b border-white/10 pb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Permisos</h1>
            <p className="mt-2 text-sm text-gray-400 max-w-3xl">
              Registro y aprobación de permisos por empleado, con enlace al resumen de asistencia en el mismo
              rango de fechas cuando aplica.
            </p>
          </header>
          
          <LeaveManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
