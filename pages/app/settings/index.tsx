import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import CompanySettings from '../../../components/CompanySettings'

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Configuración</h1>
            <p className="text-gray-300">Configura los parámetros del sistema</p>
          </div>
          
          <CompanySettings />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
