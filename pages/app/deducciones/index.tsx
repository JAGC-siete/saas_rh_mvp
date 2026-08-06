import ProtectedRoute from '../../../components/ProtectedRoute'
import AppRoleGate from '../../../components/AppRoleGate'
import DashboardLayout from '../../../components/DashboardLayout'
import DeduccionesManager from '../../../components/DeduccionesManager'
import { PAYROLL_NAV_ROLES } from '../../../lib/auth/role-access'
import { canAccessDeduccionesModule } from '../../../lib/security/deducciones-access'

export default function DeduccionesPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate
        allowRoles={PAYROLL_NAV_ROLES}
        allowWhen={(profile) => canAccessDeduccionesModule(profile.role, profile.permissions)}
      >
        <DashboardLayout>
          <DeduccionesManager />
        </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
