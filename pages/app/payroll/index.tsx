import ProtectedRoute from '../../../components/ProtectedRoute'
import AppRoleGate from '../../../components/AppRoleGate'
import DashboardLayout from '../../../components/DashboardLayout'
import PayrollManagerNew from '../../../components/PayrollManagerNew'
import { PAYROLL_NAV_ROLES } from '../../../lib/auth/role-access'

export default function PayrollPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={PAYROLL_NAV_ROLES}>
        <DashboardLayout>
          <PayrollManagerNew />
        </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
