import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
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

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Executive Dashboard: Iniciando fetch de datos...')
      
      // Usar el nuevo API con service role key
      const response = await fetch('/api/dashboard/executive-stats')
      console.log('📡 Executive Dashboard: Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Executive Dashboard: Datos recibidos exitosamente')
        console.log('📊 Executive Dashboard: Resumen de datos:', {
          totalEmployees: data.totalEmployees,
          activeEmployees: data.activeEmployees,
          presentToday: data.presentToday,
          absentToday: data.absentToday,
          lateToday: data.lateToday,
          totalPayroll: data.totalPayroll,
          attendanceRate: data.attendanceRate
        })
        
        setStats({
          totalEmployees: data.totalEmployees || 0,
          activeEmployees: data.activeEmployees || 0,
          presentToday: data.presentToday || 0,
          absentToday: data.absentToday || 0,
          lateToday: data.lateToday || 0,
          totalPayroll: data.totalPayroll || 0,
          averageSalary: data.averageSalary || 0,
          attendanceRate: data.attendanceRate || 0,
          departmentStats: data.departmentStats || {},
          recentPayrolls: data.recentPayrolls || []
        })
        
        console.log('✅ Executive Dashboard: Estado actualizado con datos')
      } else {
        console.error('❌ Executive Dashboard: Error en response:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('❌ Executive Dashboard: Error details:', errorText)
      }
    } catch (error) {
      console.error('💥 Executive Dashboard: Error en fetchDashboardData:', error)
    } finally {
      setLoading(false)
      console.log('✅ Executive Dashboard: Loading completado')
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

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className="lg:col-span-3">
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
                    onClick={() => router.push('/departments')}
                  >
                    🏢 Gestión de Departamentos
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