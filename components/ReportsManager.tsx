import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface ReportStats {
  totalEmployees: number
  totalAttendance: number
  totalPayroll: number
  averageAttendance: number
  lateEmployees: number
  absentEmployees: number
}

interface DateFilter {
  type: 'today' | 'week' | 'biweek' | 'month'
  startDate: string
  endDate: string
  label: string
}

export default function ReportsManager() {
  const [stats, setStats] = useState<ReportStats>({
    totalEmployees: 0,
    totalAttendance: 0,
    totalPayroll: 0,
    averageAttendance: 0,
    lateEmployees: 0,
    absentEmployees: 0
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>({
    type: 'today',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    label: 'Hoy'
  })

  const dateFilters: DateFilter[] = [
    {
      type: 'today',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      label: 'Hoy'
    },
    {
      type: 'week',
      startDate: getWeekStart(),
      endDate: new Date().toISOString().split('T')[0],
      label: 'Esta Semana'
    },
    {
      type: 'biweek',
      startDate: getBiweekStart(),
      endDate: new Date().toISOString().split('T')[0],
      label: 'Esta Quincena'
    },
    {
      type: 'month',
      startDate: getMonthStart(),
      endDate: new Date().toISOString().split('T')[0],
      label: 'Este Mes'
    }
  ]

  function getWeekStart(): string {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  function getBiweekStart(): string {
    const today = new Date()
    const day = today.getDate()
    const startDay = day <= 15 ? 1 : 16
    const biweekStart = new Date(today.getFullYear(), today.getMonth(), startDay)
    return biweekStart.toISOString().split('T')[0]
  }

  function getMonthStart(): string {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  }

  const fetchReportStats = async (filter: DateFilter) => {
    try {
      setLoading(true)
      
      // Obtener empleados activos
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, base_salary, status, department_id')
        .eq('status', 'active')

      if (empError) {
        console.error('Error fetching employees:', empError)
        return
      }

      // Obtener registros de asistencia del período
      const { data: attendanceRecords, error: attError } = await supabase
        .from('attendance_records')
        .select('employee_id, date, check_in, check_out, status')
        .gte('date', filter.startDate)
        .lte('date', filter.endDate)

      if (attError) {
        console.error('Error fetching attendance records:', attError)
        return
      }

      // Obtener registros de nómina del período
      const { data: payrollRecords, error: payrollError } = await supabase
        .from('payroll_records')
        .select('*')
        .gte('period_start', filter.startDate)
        .lte('period_end', filter.endDate)

      if (payrollError) {
        console.error('Error fetching payroll records:', payrollError)
      }

      // Calcular estadísticas
      const totalEmployees = employees?.length || 0
      const totalAttendance = attendanceRecords?.length || 0
      const totalPayroll = payrollRecords?.reduce((sum: number, record: any) => sum + (record.net_salary || 0), 0) || 0
      const averageAttendance = totalEmployees > 0 ? totalAttendance / totalEmployees : 0

      // Calcular empleados tardíos y ausentes
      const lateEmployees = new Set(
        attendanceRecords
          ?.filter((record: any) => {
            if (!record.check_in) return false
            const checkInTime = new Date(record.check_in)
            const hour = checkInTime.getHours()
            const minutes = checkInTime.getMinutes()
            return hour > 8 || (hour === 8 && minutes > 15)
          })
          .map((record: any) => record.employee_id) || []
      ).size

      const absentEmployees = new Set(
        attendanceRecords
          ?.filter((record: any) => record.status === 'absent')
          .map((record: any) => record.employee_id) || []
      ).size

      setStats({
        totalEmployees,
        totalAttendance,
        totalPayroll,
        averageAttendance,
        lateEmployees,
        absentEmployees
      })
    } catch (error) {
      console.error('Error fetching report stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportStats(selectedFilter)
  }, [selectedFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const exportReport = async (format: 'pdf' | 'csv') => {
    try {
      setExporting(true)
      
      const response = await fetch(`/api/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv'
        },
        body: JSON.stringify({
          format,
          dateFilter: selectedFilter,
          reportType: 'comprehensive'
        })
      })

      if (!response.ok) {
        throw new Error('Error exportando reporte')
      }

      if (format === 'pdf') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_${selectedFilter.type}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_${selectedFilter.type}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Error al exportar el reporte')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas de reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reportes y Estadísticas</h1>
        <p className="text-gray-600">Genera reportes detallados de asistencia, nómina y empleados</p>
      </div>

      {/* Filtros de fecha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtro de Período</CardTitle>
          <CardDescription>Selecciona el período para los reportes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dateFilters.map((filter) => (
              <Button
                key={filter.type}
                variant={selectedFilter.type === filter.type ? 'default' : 'outline'}
                onClick={() => setSelectedFilter(filter)}
                className="min-w-[120px]"
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <strong>Período seleccionado:</strong> {selectedFilter.startDate} - {selectedFilter.endDate}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Badge variant="secondary">{selectedFilter.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Empleados activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros de Asistencia</CardTitle>
            <Badge variant="secondary">{selectedFilter.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendance}</div>
            <p className="text-xs text-muted-foreground">Total de registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Total</CardTitle>
            <Badge variant="secondary">{selectedFilter.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPayroll)}</div>
            <p className="text-xs text-muted-foreground">Salarios procesados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Asistencia</CardTitle>
            <Badge variant="secondary">{selectedFilter.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageAttendance.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Registros por empleado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Tardíos</CardTitle>
            <Badge variant="destructive">{selectedFilter.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lateEmployees}</div>
            <p className="text-xs text-muted-foreground">Con tardanzas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Ausentes</CardTitle>
            <Badge variant="destructive">{selectedFilter.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absentEmployees}</div>
            <p className="text-xs text-muted-foreground">Sin asistencia</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones de exportación */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Reportes</CardTitle>
          <CardDescription>Genera reportes en PDF o CSV con los datos del período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => exportReport('pdf')} 
              disabled={exporting}
              className="min-w-[150px]"
            >
              {exporting ? 'Generando...' : 'Exportar PDF'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => exportReport('csv')} 
              disabled={exporting}
              className="min-w-[150px]"
            >
              {exporting ? 'Generando...' : 'Exportar CSV'}
            </Button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <strong>Reporte incluye:</strong> Estadísticas de empleados, asistencia, nómina, tardanzas y ausencias
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 