import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import LeaveManager from '../../../components/LeaveManager'
import { useTranslations } from 'next-intl'

export default function LeavePage() {
  const tl = useTranslations('leave.page')
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <header className="border-b border-white/10 pb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">{tl('title')}</h1>
            <p className="mt-2 text-sm text-gray-400 max-w-3xl">
              {tl('subtitle')}
            </p>
          </header>
          
          <LeaveManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
