import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import AppRoleGate from '../../../components/AppRoleGate'
import DashboardLayout from '../../../components/DashboardLayout'
import { PAYROLL_NAV_ROLES } from '../../../lib/auth/role-access'

const DeduccionesManager = dynamic(
  () => import('../../../components/DeduccionesManager'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    )
  }
)

export default function DeduccionesPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={PAYROLL_NAV_ROLES}>
      <DashboardLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
            </div>
          }
        >
          <DeduccionesManager />
        </Suspense>
      </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
