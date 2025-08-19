import { useState, useCallback } from 'react'
import { useCompanyContext } from '../useCompanyContext'

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

interface UseReportsReturn {
  // Estado
  stats: DashboardStats | null
  attendanceTrends: AttendanceTrend[]
  loading: boolean
  error: string | null
  
  // Acciones
  // eslint-disable-next-line no-unused-vars
  fetchDashboardStats: (startDate: string, endDate: string) => Promise<void>
  // eslint-disable-next-line no-unused-vars
  fetchAttendanceTrends: (startDate: string, endDate: string) => Promise<void>
  // eslint-disable-next-line no-unused-vars
  exportReport: (type: 'attendance' | 'payroll' | 'employees', startDate: string, endDate: string) => Promise<void>
  clearError: () => void
}

export function useReports(): UseReportsReturn {
  const { companyId } = useCompanyContext()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [loadingExport, setLoadingExport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchDashboardStats = useCallback(async (startDate: string, endDate: string) => {
    if (!companyId) {
      setError('No hay empresa seleccionada')
      return
    }

    try {
      setLoadingStats(true)
      setError(null)

      const response = await fetch(`/api/reports/dashboard-stats?startDate=${startDate}&endDate=${endDate}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error HTTP: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setStats(result.data)
      } else {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [companyId])

  const fetchAttendanceTrends = useCallback(async (startDate: string, endDate: string) => {
    if (!companyId) {
      setError('No hay empresa seleccionada')
      return
    }

    try {
      setLoadingTrends(true)
      setError(null)

      const response = await fetch(`/api/reports/attendance-trends?startDate=${startDate}&endDate=${endDate}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error HTTP: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setAttendanceTrends(result.data)
      } else {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching attendance trends:', err)
    } finally {
      setLoadingTrends(false)
    }
  }, [companyId])

  const exportReport = useCallback(async (type: 'attendance' | 'payroll' | 'employees', startDate: string, endDate: string) => {
    if (!companyId) {
      setError('No hay empresa seleccionada')
      return
    }

    try {
      setLoadingExport(true)
      setError(null)

      const response = await fetch(`/api/reports/export-${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          dateFilter: { startDate, endDate }
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
      a.download = `${type}_report_${startDate}_${endDate}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error exporting report:', err)
    } finally {
      setLoadingExport(false)
    }
  }, [companyId])

  return {
    stats,
    attendanceTrends,
    loading: loadingStats || loadingTrends || loadingExport,
    error,
    fetchDashboardStats,
    fetchAttendanceTrends,
    exportReport,
    clearError
  }
}
