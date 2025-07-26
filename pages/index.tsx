import { useSupabaseSession, supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AuthForm from '../components/AuthForm'
import DashboardLayout from '../components/DashboardLayout'
import AttendanceManager from '../components/AttendanceManager'

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  todayAttendance: number
  pendingPayrolls: number
}

export default function HomePage() {
  const { session, loading: sessionLoading } = useSupabaseSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    todayAttendance: 0,
    pendingPayrolls: 0
  })

  useEffect(() => {
    setLoading(false)
    if (session?.user) {
      fetchStats()
    }
  }, [session])

  const fetchStats = async () => {
    try {
      // Fetch employees count
      const { data: employees } = await supabase
        .from('employees')
        .select('id, status')
      
      const totalEmployees = employees?.length || 0
      const activeEmployees = employees?.filter(emp => emp.status === 'active').length || 0

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('date', today)
        .not('check_in', 'is', null)

      const todayAttendance = attendance?.length || 0

      // Fetch pending payrolls
      const { data: payrolls } = await supabase
        .from('payroll_records')
        .select('id')
        .eq('status', 'draft')

      const pendingPayrolls = payrolls?.length || 0

      setStats({
        totalEmployees,
        activeEmployees,
        todayAttendance,
        pendingPayrolls
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return <AuthForm />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-600">Bienvenido al sistema de Recursos Humanos</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/employees')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Empleados Activos</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.activeEmployees}</p>
            <p className="text-sm text-gray-500">de {stats.totalEmployees} total</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/attendance')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Asistencias Hoy</h3>
            <p className="text-3xl font-bold text-green-600">{stats.todayAttendance}</p>
            <p className="text-sm text-gray-500">Registros de entrada</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/payroll')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nóminas Pendientes</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingPayrolls}</p>
            <p className="text-sm text-gray-500">Por procesar</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/reports')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ver Reportes</h3>
            <p className="text-3xl font-bold text-purple-600">📊</p>
            <p className="text-sm text-gray-500">Analítica y métricas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/employees')}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Registrar Nuevo Empleado</div>
                <div className="text-sm text-gray-600">Agregar un empleado al sistema</div>
              </button>
              
              <button
                onClick={() => router.push('/attendance')}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Registrar Asistencia</div>
                <div className="text-sm text-gray-600">Marcar entrada o salida de empleados</div>
              </button>
              
              <button
                onClick={() => router.push('/payroll')}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Procesar Nómina</div>
                <div className="text-sm text-gray-600">Generar nómina para empleados</div>
              </button>
            </div>
          </div>

          <AttendanceManager />
        </div>
      </div>
    </DashboardLayout>
  )
}
