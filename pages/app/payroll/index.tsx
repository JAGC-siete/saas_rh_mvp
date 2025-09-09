import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Import the payroll manager component
const PayrollManager = dynamic(() => import('../../../components/PayrollManager'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
})

export default function PayrollPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PayrollManager />
    </Suspense>
  )
}
