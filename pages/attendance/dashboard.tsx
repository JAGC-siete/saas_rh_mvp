import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  late_minutes: number
  early_departure_minutes: number
  justification: string | null
  status: string
  employees: {
    name: string
    employee_code: string
    dni: string
    department_id: string
  }
}

interface AttendanceStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateToday: number
  onTimeToday: number
  averageAttendance: number
}

export default function AttendanceDashboard() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onTimeToday: 0,
    averageAttendance: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDepartment, setFilterDepartment] = useState('')

  const fetchAttendanceData = async () => {
    setLoading(true)
    try {
      // Obtener registros de asistencia del día seleccionado
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employees:employee_id (
            name,
            employee_code,
            dni,
            department_id
          )
        `)
        .eq('date', selectedDate)
        .order('check_in', { ascending: false })

      if (error) {
        console.error('Error fetching attendance:', error)
        return
      }

      setAttendanceRecords(records || [])

      // Obtener estadísticas
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('is_active', true)

      const totalEmployees = employees?.length || 0
      const presentToday = records?.length || 0
      const lateToday = records?.filter(r => r.late_minutes > 0).length || 0
      const onTimeToday = presentToday - lateToday
      const absentToday = totalEmployees - presentToday
      const averageAttendance = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0

      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        onTimeToday,
        averageAttendance
      })

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendanceData()
  }, [selectedDate])

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.check_in) return <Badge variant="destructive">Ausente</Badge>
    if (record.late_minutes > 0) return <Badge variant="secondary">Tardanza ({record.late_minutes} min)</Badge>
    if (record.check_out) return <Badge variant="default">Completo</Badge>
    return <Badge variant="outline">Presente</Badge>
  }

  const filteredRecords = attendanceRecords.filter(record => 
    !filterDepartment || record.employees?.department_id === filterDepartment
  )

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Asistencia</h1>
              <p className="text-gray-600">Administra y monitorea la asistencia de empleados</p>
            </div>
            <Button onClick={() => window.location.href = '/attendance/register'}>
              Ir a Registro
            </Button>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <Input
                    placeholder="Filtrar por departamento"
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-48"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Presentes Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.averageAttendance.toFixed(1)}% de asistencia
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
                  {stats.presentToday > 0 ? ((stats.lateToday / stats.presentToday) * 100).toFixed(1) : 0}% de presentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ausentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEmployees > 0 ? ((stats.absentToday / stats.totalEmployees) * 100).toFixed(1) : 0}% del total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Asistencia */}
          <Card>
            <CardHeader>
              <CardTitle>Registros de Asistencia - {new Date(selectedDate).toLocaleDateString('es-HN')}</CardTitle>
              <CardDescription>
                {filteredRecords.length} registros encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
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
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{record.employees?.name || 'N/A'}</td>
                          <td className="py-3 px-4">{record.employees?.employee_code || 'N/A'}</td>
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
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 