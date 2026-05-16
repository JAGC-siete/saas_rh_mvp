import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import AppRoleGate from '../../../components/AppRoleGate'
import DashboardLayout from '../../../components/DashboardLayout'
import { PAYROLL_NAV_ROLES } from '../../../lib/auth/role-access'

// Import the new payroll manager component
const PayrollManagerNew = dynamic(() => import('../../../components/PayrollManagerNew'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
    </div>
  )
})

export default function PayrollPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={PAYROLL_NAV_ROLES}>
      <DashboardLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        }>
          <PayrollManagerNew />
        </Suspense>
      </DashboardLayout>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
