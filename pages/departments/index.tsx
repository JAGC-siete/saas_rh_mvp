import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import DepartmentManager from '../../components/DepartmentManager'

export default function DepartmentsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Departamentos</h1>
            <p className="text-gray-600">Administra los departamentos de la empresa</p>
          </div>
          
          <DepartmentManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
