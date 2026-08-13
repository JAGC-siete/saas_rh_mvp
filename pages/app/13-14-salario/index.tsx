import ProtectedRoute from '../../../components/ProtectedRoute'
import AppRoleGate from '../../../components/AppRoleGate'
import DashboardLayout from '../../../components/DashboardLayout'
import ThirteenthFourteenthManager from '../../../components/13-14-salario/ThirteenthFourteenthManager'
import { PAYROLL_NAV_ROLES } from '../../../lib/auth/role-access'

export default function ThirteenthFourteenthSalaryPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={PAYROLL_NAV_ROLES}>
        <DashboardLayout>
          <ThirteenthFourteenthManager />
        </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
