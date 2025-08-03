import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardLayout from '../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  presentToday: number
  absentToday: number
  lateToday: number
  totalPayroll: number
  averageSalary: number
  attendanceRate: number
  departmentStats: { [key: string]: number }
  recentPayrolls: any[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    totalPayroll: 0,
    averageSalary: 0,
    attendanceRate: 0,
    departmentStats: {},
    recentPayrolls: []
  })
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) return
      setUserProfile(profile)

      // Obtener empleados
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, status, department, base_salary')
        .eq('company_id', profile.company_id)

      // Obtener asistencia de hoy
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance } = await supabase
        .from('attendance_records')
        .select('employee_id, check_in, check_out, status')
        .eq('date', today)
        .eq('company_id', profile.company_id)

      // Obtener nóminas recientes
      const { data: recentPayrolls } = await supabase
        .from('payroll_records')
        .select(`
          *,
          employees:employee_id (name, department)
        `)
        .eq('employees.company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Calcular estadísticas
      const activeEmployees = employees?.filter((emp: any) => emp.status === 'active') || []
      const presentToday = todayAttendance?.filter((att: any) => att.check_in && att.check_out) || []
      const absentToday = todayAttendance?.filter((att: any) => att.status === 'absent') || []
      const lateToday = todayAttendance?.filter((att: any) => {
        if (!att.check_in) return false
        const checkInTime = new Date(att.check_in)
        const hour = checkInTime.getHours()
        const minutes = checkInTime.getMinutes()
        return hour > 8 || (hour === 8 && minutes > 5)
      }) || []

      // Estadísticas por departamento
      const deptStats: { [key: string]: number } = {}
      activeEmployees.forEach((emp: any) => {
        const dept = emp.department || 'Sin Departamento'
        deptStats[dept] = (deptStats[dept] || 0) + 1
      })

      const totalPayroll = activeEmployees.reduce((sum: number, emp: any) => sum + (emp.base_salary || 0), 0)
      const averageSalary = activeEmployees.length > 0 ? totalPayroll / activeEmployees.length : 0
      const attendanceRate = activeEmployees.length > 0 ? (presentToday.length / activeEmployees.length) * 100 : 0

      // Estadísticas de nómina
      const pendingPayrolls = recentPayrolls?.filter((r: any) => r.status === 'pending').length || 0
      const completedPayrolls = recentPayrolls?.filter((r: any) => r.status === 'completed').length || 0

      setStats({
        totalEmployees: employees?.length || 0,
        activeEmployees: activeEmployees.length,
        presentToday: presentToday.length,
        absentToday: absentToday.length,
        lateToday: lateToday.length,
        totalPayroll,
        averageSalary,
        attendanceRate,
        departmentStats: deptStats,
        recentPayrolls: recentPayrolls || []
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const router = useRouter()

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Cargando dashboard...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏢 Dashboard Ejecutivo - Paragon Honduras</h1>
              <p className="text-gray-600">Vista general del sistema de recursos humanos</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/payroll')}>
                📊 Gestión de Nómina
              </Button>
              <Button variant="outline" onClick={() => router.push('/employees')}>
                👥 Empleados
              </Button>
            </div>
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
                <span className="text-2xl">👥</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeEmployees} activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Asistencia Hoy</CardTitle>
                <span className="text-2xl">📅</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.absentToday} ausentes • {stats.lateToday} tardanzas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nómina Total</CardTitle>
                <span className="text-2xl">💰</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalPayroll)}</div>
                <p className="text-xs text-muted-foreground">
                  Promedio: {formatCurrency(stats.averageSalary)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa Asistencia</CardTitle>
                <span className="text-2xl">📈</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Últimos 7 días
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Department Stats and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>🏢 Distribución por Departamento</CardTitle>
                <CardDescription>
                  Empleados activos por departamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.departmentStats).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">{dept}</span>
                      </div>
                      <span className="text-sm text-gray-600">{count} empleados</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>⚡ Acciones Rápidas</CardTitle>
                <CardDescription>
                  Acceso directo a funciones principales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/payroll')}
                  >
                    📊 Generar Nómina
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/employees')}
                  >
                    👥 Gestionar Empleados
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/attendance')}
                  >
                    📅 Ver Asistencia
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/reports')}
                  >
                    📋 Reportes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payrolls */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Nóminas Recientes</CardTitle>
              <CardDescription>
                Últimas nóminas generadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentPayrolls.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentPayrolls.map((payroll, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          Nómina {payroll.period_start} - {payroll.period_end}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payroll.employees?.name} • {payroll.employees?.department}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(payroll.net_salary)}</div>
                        <div className="text-sm text-gray-500 capitalize">{payroll.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay nóminas recientes
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>🔧 Estado del Sistema</CardTitle>
              <CardDescription>
                Información del sistema y conexiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Base de datos: Conectada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Autenticación: Activa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">API: Funcionando</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 