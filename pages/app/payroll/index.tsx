import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'

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
      <DashboardLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        }>
          <PayrollManagerNew />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
