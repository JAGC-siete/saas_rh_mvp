import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import CompanySettings from '../../components/CompanySettings'

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-gray-600">Administra la configuración de la empresa</p>
          </div>
          
          <CompanySettings />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
