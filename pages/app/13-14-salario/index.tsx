import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'

const ThirteenthFourteenthManager = dynamic(
  () => import('../../../components/13-14-salario/ThirteenthFourteenthManager'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }
)

export default function ThirteenthFourteenthSalaryPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          }
        >
          <ThirteenthFourteenthManager />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
