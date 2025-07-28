import { GetServerSideProps } from 'next'
import { useSupabaseSession } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'
import EmployeeManager from '../../components/EmployeeManager'

export default function EmployeesPage() {
  const { session, loading: sessionLoading } = useSupabaseSession()

  if (!session) {
    return <div>Redirecting...</div>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Empleados</h1>
          <p className="text-gray-600">Administra la información de empleados</p>
        </div>
        
        <EmployeeManager />
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
