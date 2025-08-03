import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardLayout from '../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

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
  monthlyExpense: number
  pendingPayrolls: number
  completedPayrolls: number
  leaveRequests: number
  pendingLeaves: number
}

interface Employee {
  id: string
  name: string
  status: string
  department: string
  base_salary: number
}

interface AttendanceRecord {
  employee_id: string
  check_in: string
  check_out: string
  status: string
}

interface PayrollRecord {
  period_start: string
  period_end: string
  net_salary: number
  status: string
  employees?: {
    name: string
    department: string
  }
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
    recentPayrolls: [],
    monthlyExpense: 0,
    pendingPayrolls: 0,
    completedPayrolls: 0,
    leaveRequests: 0,
    pendingLeaves: 0
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
        .select('id, name, status, department_id, base_salary')
        .eq('status', 'active')

      // Obtener asistencia de hoy
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance } = await supabase
        .from('attendance_records')
        .select('employee_id, check_in, check_out, status, late_minutes')
        .eq('date', today)

      // Obtener nóminas recientes
      const { data: recentPayrolls } = await supabase
        .from('payroll_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      // Obtener solicitudes de permisos
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'pending')

      // Calcular estadísticas
      const activeEmployees = employees?.filter((emp: Employee) => emp.status === 'active') || []
      const presentToday = todayAttendance?.filter((att: AttendanceRecord) => att.check_in && att.check_out) || []
      const absentToday = todayAttendance?.filter((att: AttendanceRecord) => att.status === 'absent') || []
      const lateToday = todayAttendance?.filter((att: AttendanceRecord) => {
        if (!att.check_in) return false
        const checkInTime = new Date(att.check_in)
        const hour = checkInTime.getHours()
        const minutes = checkInTime.getMinutes()
        return hour > 8 || (hour === 8 && minutes > 5)
      }) || []

      const deptStats: { [key: string]: number } = {}
      activeEmployees.forEach((emp: Employee) => {
        const dept = emp.department || 'Sin Departamento'
        deptStats[dept] = (deptStats[dept] || 0) + 1
      })

      const totalPayroll = activeEmployees.reduce((sum: number, emp: Employee) => sum + (emp.base_salary || 0), 0)
      const averageSalary = activeEmployees.length > 0 ? totalPayroll / activeEmployees.length : 0
      const attendanceRate = activeEmployees.length > 0 ? (presentToday.length / activeEmployees.length) * 100 : 0

      // Estadísticas de nómina
      const pendingPayrolls = recentPayrolls?.filter((r: PayrollRecord) => r.status === 'pending').length || 0
      const completedPayrolls = recentPayrolls?.filter((r: PayrollRecord) => r.status === 'completed').length || 0

      setStats({
        totalEmployees: employees?.length || 0,
        activeEmployees: activeEmployees.length,
        presentToday: presentToday.length,
        absentToday: absentToday.length,
        lateToday: lateToday.length,
        totalPayroll,
        averageSalary,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        departmentStats: deptStats,
        recentPayrolls: recentPayrolls || [],
        monthlyExpense: totalPayroll,
        pendingPayrolls,
        completedPayrolls,
        leaveRequests: leaveRequests?.length || 0,
        pendingLeaves: leaveRequests?.filter((r: any) => r.status === 'pending').length || 0
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Procesando</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando dashboard ejecutivo...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
            <p className="text-gray-600">Resumen general del sistema de recursos humanos</p>
          </div>

          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
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
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.presentToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.absentToday} ausentes, {stats.lateToday} tardanzas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nómina Mensual</CardTitle>
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
                <CardTitle className="text-sm font-medium">Tasa de Asistencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Hoy
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Métricas secundarias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nóminas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingPayrolls}</div>
                <p className="text-xs text-muted-foreground">Por procesar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nóminas Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedPayrolls}</div>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Solicitudes de Permisos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.leaveRequests}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingLeaves} pendientes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gasto Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.monthlyExpense)}</div>
                <p className="text-xs text-muted-foreground">Total salarios</p>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas por departamento y nóminas recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Empleados por Departamento</CardTitle>
                <CardDescription>Distribución de personal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.departmentStats).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{dept}</p>
                        <p className="text-sm text-gray-500">{count} empleados</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {((count / stats.totalEmployees) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nóminas Recientes</CardTitle>
                <CardDescription>Últimas nóminas procesadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentPayrolls.slice(0, 5).map((payroll: PayrollRecord, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {new Date(payroll.period_start).toLocaleDateString()} - {new Date(payroll.period_end).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payroll.employees?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payroll.net_salary)}</p>
                        {getStatusBadge(payroll.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Acceso directo a funciones principales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button onClick={() => window.location.href = '/attendance/dashboard'}>
                  Ver Asistencia
                </Button>
                <Button onClick={() => window.location.href = '/payroll/dashboard'}>
                  Gestionar Nómina
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/employees'}>
                  Empleados
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/reports'}>
                  Reportes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 