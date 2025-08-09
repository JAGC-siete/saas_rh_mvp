import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

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
  recentPayrolls: RecentPayroll[]
}

// Tipado local, no exportado: 0 impacto fuera del archivo
type RecentPayroll = {
  id?: string | number
  period_start?: string
  period_end?: string
  employees?: { name?: string; department?: string }
  net_salary?: number
  status?: string
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
  const router = useRouter()

  // Memo: evitar recrear el formateador en cada render/llamada
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }),
    []
  )
  const formatCurrency = (amount: number) => currencyFormatter.format(amount ?? 0)

  // useCallback con soporte para AbortSignal; no cambia firma pública del componente
  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/dashboard/executive-stats', { signal })
      if (response.ok) {
        const data = await response.json()
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
      } else {
        const errorText = await response.text().catch(() => '')
        console.error('[Executive Dashboard] HTTP', response.status, response.statusText, errorText)
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('[Executive Dashboard] Fetch error:', error)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Efecto con cancelación y guardia de montaje
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    ;(async () => {
      if (!isMounted) return
      await fetchDashboardData(controller.signal)
    })()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [fetchDashboardData])

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-white font-medium">Cargando dashboard...</div>
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
              <h1 className="text-3xl font-bold text-white">🏢 Dashboard Ejecutivo - Paragon Honduras</h1>
              <p className="text-gray-300">Vista general del sistema de recursos humanos</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/payroll')}
                className="bg-brand-900 hover:bg-brand-800 text-white font-medium"
              >
                📊 Gestión de Nómina
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/employees')}
                className="border-brand-600 bg-white/10 text-white hover:bg-brand-800 hover:text-white font-medium"
              >
                👥 Empleados
              </Button>
            </div>
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Empleados</CardTitle>
                <span className="text-2xl">👥</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalEmployees}</div>
                <p className="text-xs text-gray-300">
                  {stats.activeEmployees} activos
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Asistencia Hoy</CardTitle>
                <span className="text-2xl">📅</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{stats.presentToday}</div>
                <p className="text-xs text-gray-300">
                  {stats.absentToday} ausentes • {stats.lateToday} tardanzas
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Nómina Total</CardTitle>
                <span className="text-2xl">💰</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalPayroll)}</div>
                <p className="text-xs text-gray-300">
                  Promedio: {formatCurrency(stats.averageSalary)}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Tasa Asistencia</CardTitle>
                <span className="text-2xl">📈</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {Number.isFinite(stats.attendanceRate) ? stats.attendanceRate.toFixed(1) : '0.0'}%
                </div>
                <p className="text-xs text-gray-300">
                  Últimos 7 días
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card variant="glass" className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-white">⚡ Acciones Rápidas</CardTitle>
                <CardDescription className="text-gray-300">
                  Acceso directo a funciones principales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-brand-900 hover:bg-brand-800 text-white font-medium" 
                    onClick={() => router.push('/payroll')}
                  >
                    📊 Generar Nómina
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-brand-600 bg-white/10 text-white hover:bg-brand-800 hover:text-white font-medium"
                    onClick={() => router.push('/employees')}
                  >
                    👥 Gestionar Empleados
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-brand-600 bg-white/10 text-white hover:bg-brand-800 hover:text-white font-medium"
                    onClick={() => router.push('/departments')}
                  >
                    🏢 Gestión de Departamentos
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-brand-600 bg-white/10 text-white hover:bg-brand-800 hover:text-white font-medium"
                    onClick={() => router.push('/attendance')}
                  >
                    📅 Ver Asistencia
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-brand-600 bg-white/10 text-white hover:bg-brand-800 hover:text-white font-medium"
                    onClick={() => router.push('/reports')}
                  >
                    📋 Reportes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payrolls */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">📋 Nóminas Recientes</CardTitle>
              <CardDescription className="text-gray-300">
                Últimas nóminas generadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentPayrolls.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentPayrolls.map((payroll, index) => (
                    <div key={(payroll as any)?.id ?? index} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div>
                        <div className="font-medium text-white">
                          Nómina {payroll.period_start} - {payroll.period_end}
                        </div>
                        <div className="text-sm text-gray-300">
                          {payroll.employees?.name} • {payroll.employees?.department}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">{formatCurrency(payroll.net_salary ?? 0)}</div>
                        <div className="text-sm text-gray-300 capitalize">{payroll.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-300">
                  No hay nóminas recientes
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">🔧 Estado del Sistema</CardTitle>
              <CardDescription className="text-gray-300">
                Información del sistema y conexiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-200">Base de datos: Conectada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-200">Autenticación: Activa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-200">API: Funcionando</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 