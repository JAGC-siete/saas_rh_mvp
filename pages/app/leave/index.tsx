import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import LeaveManager from '../../../components/LeaveManager'

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
            <p className="text-gray-600">Administra los permisos y licencias</p>
          </div>
          
          <LeaveManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
