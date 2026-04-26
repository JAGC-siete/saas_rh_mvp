import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabaseSession } from '../lib/hooks/useSession'
import { useCompanyContext } from '../lib/useCompanyContext'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { nowInHonduras } from '../lib/timezone'
import { useReportsExport } from '../lib/hooks/useReportsExport'
import { ExportFormatButtons } from './ui/ExportFormatButtons'

// Iconos simples como placeholders
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V9a3 3 0 00-6 0v2.25" />
  </svg>
)

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CurrencyDollarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const CalendarDaysIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const DocumentChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

function QualityControlExport() {
  const [periodo, setPeriodo] = useState(() => {
    const n = nowInHonduras()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [quincena, setQuincena] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [loadingFormat, setLoadingFormat] = useState<'csv' | 'excel' | null>(null)

  async function download(format: 'csv' | 'excel') {
    setLoading(true)
    setLoadingFormat(format)
    try {
      const res = await fetch('/api/reports/quality/attendance-vs-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ periodo, quincena, format })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `control_calidad_${periodo}_q${quincena}.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error('Error exportando control de calidad:', e)
      alert((e as Error).message)
    } finally {
      setLoading(false)
      setLoadingFormat(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="month"
        value={periodo}
        onChange={(e) => setPeriodo(e.target.value)}
        className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
      />
      <select
        value={quincena}
        onChange={(e) => setQuincena(Number(e.target.value) as 1 | 2)}
        className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
      >
        <option value={1}>Quincena 1</option>
        <option value={2}>Quincena 2</option>
      </select>
      <ExportFormatButtons
        formats={['csv', 'excel']}
        onExport={(format) => download(format as 'csv' | 'excel')}
        disabled={loading}
        loadingFormat={loadingFormat}
        variant="outline"
      />
    </div>
  )
}

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalAttendance: number
  presentDays: number
  lateDays: number
  absentDays: number
  attendanceRate: number
  punctualityRate: number
  pendingPayrolls: number
  thisPeriodLeaves: number
  period: { startDate: string; endDate: string }
}

interface AttendanceTrend {
  date: string
  present: number
  absent: number
  late: number
}

export default function ReportsAndAnalytics() {
  const { session } = useSupabaseSession()
  const { companyId, loading: companyLoading } = useCompanyContext()
  
  // Debug logging para verificar el companyId
  useEffect(() => {
    console.log('🔍 ReportsAndAnalytics - companyId:', companyId, 'loading:', companyLoading)
  }, [companyId, companyLoading])
  
  // Estado local para datos
  const [stats, setStats] = useState<DashboardStats | null>(null)
  // const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(nowInHonduras().getFullYear(), nowInHonduras().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(nowInHonduras().getFullYear(), nowInHonduras().getMonth() + 1, 0).toISOString().split('T')[0]
  })

  // Obtener rango del mes actual
  const { monthStart, monthEnd } = useMemo(() => {
    const now = nowInHonduras()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    return { monthStart, monthEnd }
  }, [])

  // Función para obtener estadísticas del dashboard
  const fetchDashboardStats = useCallback(async () => {
    if (!companyId) {
      setError('No hay empresa seleccionada')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('Fetching reports summary for company:', companyId)

      const response = await fetch(`/api/reports`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error HTTP: ${response.status}`)
      }
      
      const result = await response.json()
      
      console.log('Reports summary response:', result)
      
      if (result.success && result.reports && result.reports.stats) {
        const apiStats = result.reports.stats as { employees?: number; attendance_records?: number; payroll_records?: number }
        const mapped: DashboardStats = {
          totalEmployees: apiStats.employees || 0,
          activeEmployees: apiStats.employees || 0,
          totalAttendance: apiStats.attendance_records || 0,
          presentDays: 0,
          lateDays: 0,
          absentDays: 0,
          attendanceRate: 0,
          punctualityRate: 0,
          pendingPayrolls: apiStats.payroll_records || 0,
          thisPeriodLeaves: 0,
          period: { startDate: monthStart, endDate: monthEnd }
        }
        setStats(mapped)
        console.log('Reports stats mapped successfully:', mapped)
      } else {
        throw new Error(result.error || 'Respuesta de reportes inválida')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching reports summary:', err)
    } finally {
      setLoading(false)
    }
  }, [monthStart, monthEnd, companyId])

  // Función para obtener tendencias de asistencia
  // Tendencias movidas al dashboard de asistencia

  // Usar hook de exportación (similar a payroll)
  const { exportAttendance, exportPayroll, exportEmployees } = useReportsExport()

  // Función para exportar reportes usando el hook
  const exportReport = useCallback(async (type: 'attendance' | 'payroll' | 'employees', format: 'csv' | 'pdf' | 'excel' = 'csv') => {
    if (!companyId) {
      setError('No hay empresa seleccionada')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (type === 'attendance') {
        await exportAttendance(format as 'excel' | 'pdf' | 'csv', dateRange.startDate, dateRange.endDate)
      } else if (type === 'payroll') {
        await exportPayroll(format as 'excel' | 'pdf' | 'csv', dateRange.startDate, dateRange.endDate)
      } else if (type === 'employees') {
        await exportEmployees(format as 'excel' | 'pdf' | 'csv')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error exporting report:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange.startDate, dateRange.endDate, companyId, exportAttendance, exportPayroll, exportEmployees])

  // Cargar datos iniciales
  useEffect(() => {
    if (session?.user && companyId && !companyLoading) {
      console.log('Refreshing dashboard for company:', companyId)
      fetchDashboardStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, companyId, companyLoading])

  // Actualizar datos cuando cambie el rango de fechas
  // Tendencias removidas de este módulo

  // Funciones auxiliares
  const formatPercentage = useCallback((value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }, [])

  const getAttendanceColor = useCallback((rate: number) => {
    if (rate >= 90) return 'text-emerald-400'
    if (rate >= 75) return 'text-orange-400'
    return 'text-red-400'
  }, [])

  const handleDateRangeChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Datos para mostrar (usar stats del backend o valores por defecto)
  const currentStats = stats || {
    totalEmployees: 0,
    activeEmployees: 0,
    totalAttendance: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendanceRate: 0,
    punctualityRate: 0,
    pendingPayrolls: 0,
    thisPeriodLeaves: 0,
    period: { startDate: '', endDate: '' }
  }

  // Tendencias recientes (últimas 10)
  // Tendencias removidas de este módulo

  // Mostrar error si existe
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">Error:</span>
              <span className="text-red-300">{error}</span>
            </div>
            <Button onClick={clearError} variant="outline" size="sm" className="text-red-400 border-red-400/20">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar loading
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con título y selector de fechas */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Reportes y Analítica</h2>
          <p className="text-gray-300">Análisis de datos y métricas de recursos humanos</p>
        </div>

        <div className="flex space-x-3">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
            className="px-3 py-2 border border-white/20 bg-white/10 rounded-md text-sm text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
            className="px-3 py-2 border border-white/20 bg-white/10 rounded-md text-sm text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-brand-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{currentStats.activeEmployees}</h3>
              <p className="text-sm text-gray-300">Empleados Activos</p>
              <p className="text-xs text-gray-400">de {currentStats.totalEmployees} total</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{currentStats.presentDays}</h3>
              <p className="text-sm text-gray-300">Asistencias del Período</p>
              <p className="text-xs text-gray-400">
                {formatPercentage(currentStats.presentDays, currentStats.totalAttendance)} del total
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-orange-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{currentStats.pendingPayrolls}</h3>
              <p className="text-sm text-gray-300">Nóminas Pendientes</p>
              <p className="text-xs text-gray-400">Por procesar</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-white">{currentStats.thisPeriodLeaves}</h3>
              <p className="text-sm text-gray-300">Permisos del Período</p>
              <p className="text-xs text-gray-400">Aprobados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tendencias movidas al dashboard de asistencia */}

      {/* Exportar reportes */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Exportar Reportes</h3>
            <p className="text-gray-300">Descarga reportes en múltiples formatos</p>
          </div>
          <DocumentChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          {/* Reporte de Asistencia */}
          <div className="space-y-2">
            <h4 className="text-md font-medium text-white flex items-center space-x-2">
              <ClockIcon className="h-5 w-5" />
              <span>Reporte de Asistencia</span>
            </h4>
            <ExportFormatButtons
              formats={['csv', 'excel', 'pdf']}
              onExport={(format) => exportReport('attendance', format)}
              disabled={loading}
              variant="outline"
            />
          </div>

          {/* Reporte de Nómina */}
          <div className="space-y-2">
            <h4 className="text-md font-medium text-white flex items-center space-x-2">
              <CurrencyDollarIcon className="h-5 w-5" />
              <span>Reporte de Nómina</span>
            </h4>
            <ExportFormatButtons
              formats={['csv', 'excel', 'pdf']}
              onExport={(format) => exportReport('payroll', format)}
              disabled={loading}
              variant="outline"
            />
          </div>

          {/* Reporte de Empleados */}
          <div className="space-y-2">
            <h4 className="text-md font-medium text-white flex items-center space-x-2">
              <UsersIcon className="h-5 w-5" />
              <span>Reporte de Empleados</span>
            </h4>
            <ExportFormatButtons
              formats={['csv', 'excel', 'pdf']}
              onExport={(format) => exportReport('employees', format)}
              disabled={loading}
              variant="outline"
            />
          </div>

          {/* Control de calidad: Asistencia vs Nómina */}
          <div className="space-y-2">
            <h4 className="text-md font-medium text-white flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5" />
              <span>Control de calidad (Asistencia vs Nómina)</span>
            </h4>
            <p className="text-sm text-gray-400">Compara horas de asistencia con horas pagadas en nómina por período</p>
            <QualityControlExport />
          </div>
        </div>
      </Card>
    </div>
  )
}
