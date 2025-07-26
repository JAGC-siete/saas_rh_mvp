import { GetServerSideProps } from 'next'
import { useSupabaseSession } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'
import AttendanceManager from '../../components/AttendanceManager'

export default function AttendancePage() {
  const { session, loading: sessionLoading } = useSupabaseSession()

  if (!session) {
    return <div>Redirecting...</div>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
          <p className="text-gray-600">Registra entrada y salida de empleados</p>
        </div>
        
        <AttendanceManager />
      </div>
    </DashboardLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // For now, we'll handle authentication on the client side
  return {
    props: {},
  }
}
