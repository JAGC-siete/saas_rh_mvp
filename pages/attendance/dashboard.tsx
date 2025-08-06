import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'

interface AttendanceStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateToday: number
  onTimeToday: number
  employeesWithApprovedLeave: number
  dailyCost: number
  dailyStats: Array<{
    date: string
    attendanceCount: number
    attendanceRate: number
  }>
  departmentStats: Record<string, { present: number; total: number }>
  todayAttendance: Array<{
    id: string
    employee_id: string
    employee_name: string
    employee_code: string
    check_in: string
    check_out: string
    late_minutes: number
    status: string
    justification: string
  }>
}

export default function AttendanceDashboard2() {
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedRange, setSelectedRange] = useState('daily')
  const [selectedFormat, setSelectedFormat] = useState('pdf')

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/attendance/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error('Error fetching stats:', response.statusText)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const exportReport = async () => {
    setExportLoading(true)
    try {
      const response = await fetch('/api/attendance/export-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: selectedRange,
          format: selectedFormat
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_asistencia_${selectedRange}_${new Date().toISOString().split('T')[0]}.${selectedFormat}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Error exporting report:', response.statusText)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (record: any) => {
    if (!record.check_in) return <Badge variant="destructive">Ausente</Badge>
    if (record.late_minutes > 0) return <Badge variant="secondary">Tardanza ({record.late_minutes} min)</Badge>
    if (record.check_out) return <Badge variant="default">Completo</Badge>
    return <Badge variant="outline">Presente</Badge>
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando dashboard de asistencia...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!stats) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-8">
            <p className="text-red-600">Error cargando estadísticas</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Dashboard de Asistencia 2.0</h1>
              <p className="text-gray-600">Vista en tiempo real de la asistencia del día</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.location.href = '/attendance/register'}>
                Ir a Registro
              </Button>
            </div>
          </div>

          {/* Estadísticas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Tasa de Asistencia - Métrica Principal */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  📊 Tasa de Asistencia Diaria
                </CardTitle>
                <CardDescription>Métrica principal del día</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 90 ? 'text-green-600' :
                      stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {stats.totalEmployees > 0 ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1) : 0}%
                    </div>
                    <div className={`text-sm font-medium ${
                      stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 90 ? 'text-green-600' :
                      stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 90 ? '🟢 Excelente' :
                       stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 80 ? '🟡 Bueno' :
                       '🔴 Requiere Atención'}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full transition-all duration-700 ${
                          stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 90 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          stats.totalEmployees > 0 && (stats.presentToday / stats.totalEmployees) * 100 >= 80 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          'bg-gradient-to-r from-red-400 to-red-600'
                        }`}
                        style={{ width: `${stats.totalEmployees > 0 ? Math.min((stats.presentToday / stats.totalEmployees) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-green-600">{stats.presentToday}</div>
                      <div className="text-gray-600">Presentes</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{stats.absentToday}</div>
                      <div className="text-gray-600">Ausentes</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  Empleados activos en el sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tardanzas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.lateToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.presentToday > 0 ? ((stats.lateToday / stats.presentToday) * 100).toFixed(1) : 0}% de los presentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Tiempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.onTimeToday}</div>
                <p className="text-xs text-muted-foreground">
                  Llegadas puntuales del día
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas Secundarias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ausentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.absentToday}</div>
                <p className="text-sm text-muted-foreground">
                  Sin registro de entrada
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>A Tiempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.onTimeToday}</div>
                <p className="text-sm text-muted-foreground">
                  Sin tardanzas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Con Permisos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.employeesWithApprovedLeave}</div>
                <p className="text-sm text-muted-foreground">
                  Permisos aprobados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Últimos 7 Días */}
          <Card>
            <CardHeader>
              <CardTitle>Asistencia Últimos 7 Días</CardTitle>
              <CardDescription>
                Tasa de asistencia diaria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-2 h-32">
                {stats.dailyStats.map((day, index) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ 
                        height: `${(day.attendanceRate / 100) * 100}%`,
                        minHeight: '4px'
                      }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(day.date).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="text-xs font-medium">
                      {day.attendanceRate}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exportar Reportes */}
          <Card>
            <CardHeader>
              <CardTitle>Exportar Reportes</CardTitle>
              <CardDescription>
                Genera reportes en PDF o CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rango
                  </label>
                  <Select value={selectedRange} onValueChange={setSelectedRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quincenal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato
                  </label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={exportReport} 
                  disabled={exportLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {exportLoading ? 'Generando...' : 'Exportar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Asistencia del Día */}
          <Card>
            <CardHeader>
              <CardTitle>Registros de Asistencia - {new Date().toLocaleDateString('es-HN')}</CardTitle>
              <CardDescription>
                {stats.todayAttendance.length} registros encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Empleado</th>
                      <th className="text-left py-3 px-4">Código</th>
                      <th className="text-left py-3 px-4">Entrada</th>
                      <th className="text-left py-3 px-4">Salida</th>
                      <th className="text-left py-3 px-4">Estado</th>
                      <th className="text-left py-3 px-4">Justificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.todayAttendance.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{record.employee_name}</td>
                        <td className="py-3 px-4">{record.employee_code}</td>
                        <td className="py-3 px-4">{formatTime(record.check_in)}</td>
                        <td className="py-3 px-4">{formatTime(record.check_out)}</td>
                        <td className="py-3 px-4">{getStatusBadge(record)}</td>
                        <td className="py-3 px-4">
                          {record.justification ? (
                            <span className="text-sm text-gray-600">{record.justification}</span>
                          ) : (
                            <span className="text-sm text-gray-400">Sin justificación</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 