import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import EmployeeManager from '../../components/EmployeeManager'

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Empleados</h1>
            <p className="text-gray-600">Administra la información de los empleados</p>
          </div>
          
          <EmployeeManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
