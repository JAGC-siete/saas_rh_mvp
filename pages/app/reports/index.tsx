import dynamic from 'next/dynamic'
import ProtectedRoute from '../../../components/ProtectedRoute'
import AppRoleGate from '../../../components/AppRoleGate'
import DashboardLayout from '../../../components/DashboardLayout'
import { PAYROLL_NAV_ROLES } from '../../../lib/auth/role-access'

// Code-splitting para mejor performance
const ReportBuilder = dynamic(
  () => import('../../../components/reports/ReportBuilder'),
  {
    ssr: true,
    loading: () => (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </div>
    ),
  }
)

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={PAYROLL_NAV_ROLES}>
      <DashboardLayout>
        <ReportBuilder />
      </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
