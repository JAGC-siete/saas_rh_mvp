import ProtectedRoute from '../../../components/ProtectedRoute'
import AppRoleGate from '../../../components/AppRoleGate'
import DashboardLayout from '../../../components/DashboardLayout'
import ReportBuilder from '../../../components/reports/ReportBuilder'
import { PAYROLL_NAV_ROLES } from '../../../lib/auth/role-access'
import { canAccessReportsModule } from '../../../lib/security/report-access'

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate
        allowRoles={PAYROLL_NAV_ROLES}
        allowWhen={(profile) => canAccessReportsModule(profile.role, profile.permissions)}
      >
        <DashboardLayout>
          <ReportBuilder />
        </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
