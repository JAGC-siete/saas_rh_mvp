import ProtectedRoute from '../components/ProtectedRoute'
import ModernEmployeeManager from '../components/ModernEmployeeManager'

export default function Employees() {
  return (
    <ProtectedRoute>
      <ModernEmployeeManager />
    </ProtectedRoute>
  )
}
