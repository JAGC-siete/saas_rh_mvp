import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import { useCompanyContext } from '../lib/useCompanyContext'
import { Button } from './ui/button'
import { Card } from './ui/card'

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
  const session = useSession()
  const { companyId, loading: companyLoading } = useCompanyContext()
  
  // Estado local para datos
  const [stats, setStats] = useState<DashboardStats | null>(null)
  // const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  })

  // Obtener rango del mes actual
  const { monthStart, monthEnd } = useMemo(() => {
    const now = new Date()
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

      console.log('Fetching dashboard stats for company:', companyId, 'period:', { monthStart, monthEnd })

      const response = await fetch(`/api/reports/dashboard-stats?startDate=${monthStart}&endDate=${monthEnd}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error HTTP: ${response.status}`)
      }
      
      const result = await response.json()
      
      console.log('Dashboard stats response:', result)
      
      if (result.success) {
        setStats(result.data)
        console.log('Dashboard stats loaded successfully:', result.data)
      } else {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }, [monthStart, monthEnd, companyId])

  // Función para obtener tendencias de asistencia
  // Tendencias movidas al dashboard de asistencia

  // Función para exportar reportes
  const exportReport = useCallback(async (type: 'attendance' | 'payroll' | 'employees') => {
    if (!companyId) {
      setError('No hay empresa seleccionada')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/reports/export-${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          dateFilter: { startDate: dateRange.startDate, endDate: dateRange.endDate }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error HTTP: ${response.status}`)
      }

      // Descargar el archivo CSV
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report_${dateRange.startDate}_${dateRange.endDate}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error exporting report:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange.startDate, dateRange.endDate, companyId])

  // Cargar datos iniciales
  useEffect(() => {
    if (session?.user && companyId && !companyLoading) {
      console.log('Refreshing dashboard for company:', companyId)
      fetchDashboardStats()
    }
  }, [session, companyId, companyLoading, monthStart, monthEnd, fetchDashboardStats])

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
            <p className="text-gray-300">Descarga reportes en formato CSV</p>
          </div>
          <DocumentChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => exportReport('attendance')}
            variant="outline"
            className="flex items-center justify-center space-x-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <ClockIcon className="h-5 w-5" />
            <span>Reporte de Asistencia</span>
          </Button>
          
          <Button
            onClick={() => exportReport('payroll')}
            variant="outline"
            className="flex items-center justify-center space-x-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <CurrencyDollarIcon className="h-5 w-5" />
            <span>Reporte de Nómina</span>
          </Button>
          
          <Button
            onClick={() => exportReport('employees')}
            variant="outline"
            className="flex items-center justify-center space-x-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <UsersIcon className="h-5 w-5" />
            <span>Reporte de Empleados</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
