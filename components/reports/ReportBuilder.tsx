import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import ReportFilters from './ReportFilters'
import ReportPreview from './ReportPreview'
import ReportKPIs from './ReportKPIs'
import ExportBar from './ExportBar'
import { nowInHonduras, formatTimeDisplay } from '../../lib/timezone'
import { useCompanyContext } from '../../lib/useCompanyContext'
import { useReportsExport } from '../../lib/hooks/useReportsExport'
import { 
  Calendar, 
  Clock, 
  FileText, 
  Users, 
  DollarSign, 
  ClipboardList,
  TrendingUp 
} from 'lucide-react'

export type ReportType = 'attendance' | 'payroll' | 'employees' | 'work_certificate' | 'severance'
export type Periodicity = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'custom'

export interface ReportFilters {
  reportType: ReportType
  periodicity: Periodicity
  from?: string
  to?: string
  employeeIds?: string[]
  teamIds?: string[]
  departmentIds?: string[]
  // Context-specific filters
  attendanceStatus?: ('present' | 'absent' | 'late' | 'permission')[]
  payrollType?: 'all' | 'regular' | 'overtime'
  employeeStatus?: 'active' | 'inactive' | 'all'
}

export interface PreviewData {
  headers: string[]
  rows: any[]
  summary?: Record<string, any>
  totalCount?: number
}

const TAB_CONFIG = [
  { id: 'attendance', label: 'Asistencia', icon: Clock, color: 'text-blue-400' },
  { id: 'payroll', label: 'Nómina', icon: DollarSign, color: 'text-green-400' },
  { id: 'employees', label: 'Empleados', icon: Users, color: 'text-purple-400' },
  { id: 'work_certificate', label: 'Constancias', icon: FileText, color: 'text-yellow-400' },
  { id: 'severance', label: 'Liquidación', icon: ClipboardList, color: 'text-orange-400' }
] as const

export default function ReportBuilder() {
  const { companyId, loading: companyLoading } = useCompanyContext()
  const [activeTab, setActiveTab] = useState<ReportType>('attendance')
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    reportType: 'attendance',
    periodicity: 'fortnightly'
  }))
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update filters when tab changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      reportType: activeTab,
      periodicity: prev.periodicity || 'fortnightly'
    }))
  }, [activeTab])

  // Generate preview data based on filters
  const generatePreview = useCallback(async () => {
    if (!companyId || companyLoading) {
      setError('Cargando información de empresa...')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      let response
      let summaryResponse

      // Build query params
      const params = new URLSearchParams()
      if (filters.from) params.append('from', filters.from)
      if (filters.to) params.append('to', filters.to)
      if (filters.employeeIds?.length) params.append('employeeIds', filters.employeeIds.join(','))
      if (filters.departmentIds?.length) params.append('departmentIds', filters.departmentIds.join(','))

      switch (filters.reportType) {
        case 'attendance':
          // Fetch data
          response = await fetch(`/api/reports/attendance?${params}`, { credentials: 'include' })
          if (!response.ok) throw new Error('Error fetching attendance data')
          const attendanceData = await response.json()
          
          // Fetch summary
          summaryResponse = await fetch(`/api/reports/attendance-summary?${params}`, { credentials: 'include' })
          if (!summaryResponse.ok) throw new Error('Error fetching attendance summary')
          const attendanceSummary = await summaryResponse.json()
          
          // Transform to PreviewData format
          const attendanceRows = (attendanceData.data || []).map((row: any) => [
            row.employee_name,
            row.date,
            row.check_in ? formatTimeDisplay(row.check_in) : '--',
            row.check_out ? formatTimeDisplay(row.check_out) : '--',
            row.status,
            row.hours_worked ? `${row.hours_worked.toFixed(1)}h` : '0h',
            row.late_minutes !== null ? `${row.late_minutes} min` : '--'
          ])

          setPreviewData({
            headers: ['Empleado', 'Fecha', 'Check-in', 'Check-out', 'Estado', 'Horas', 'Tardanza'],
            rows: attendanceRows,
            summary: attendanceSummary.summary ? {
              totalRegistros: attendanceSummary.summary.total_records,
              presentes: attendanceSummary.summary.present_count,
              ausentes: attendanceSummary.summary.absent_count,
              tardes: attendanceSummary.summary.late_count,
              asistenciaPct: attendanceSummary.summary.attendance_rate,
              puntualidadPct: attendanceSummary.summary.punctuality_rate
            } : undefined,
            totalCount: attendanceRows.length
          })
          break

        case 'payroll':
          if (filters.payrollType) params.append('payrollType', filters.payrollType)
          
          response = await fetch(`/api/reports/payroll?${params}`, { credentials: 'include' })
          if (!response.ok) throw new Error('Error fetching payroll data')
          const payrollData = await response.json()
          
          summaryResponse = await fetch(`/api/reports/payroll-summary?${params}`, { credentials: 'include' })
          if (!summaryResponse.ok) throw new Error('Error fetching payroll summary')
          const payrollSummary = await summaryResponse.json()
          
          const payrollRows = (payrollData.data || []).map((row: any) => [
            row.employee_name,
            `${new Date(row.period_start).toLocaleDateString('es-HN', { month: 'short', day: 'numeric' })} - ${new Date(row.period_end).toLocaleDateString('es-HN', { month: 'short', day: 'numeric' })}`,
            `L ${row.gross_salary.toFixed(2)}`,
            `L ${row.total_deductions.toFixed(2)}`,
            `L ${row.net_salary.toFixed(2)}`,
            row.status === 'paid' ? 'Pagado' : row.status === 'approved' ? 'Aprobado' : 'Borrador'
          ])

          setPreviewData({
            headers: ['Empleado', 'Período', 'Devengado', 'Deducciones', 'Neto', 'Estado'],
            rows: payrollRows,
            summary: payrollSummary.summary ? {
              totalDevengado: payrollSummary.summary.total_gross_salary,
              totalDeducciones: payrollSummary.summary.total_deductions,
              totalNeto: payrollSummary.summary.total_net_salary,
              empleados: payrollSummary.summary.total_employees,
              pagosPendientes: payrollSummary.summary.pending_count + payrollSummary.summary.draft_count
            } : undefined,
            totalCount: payrollRows.length
          })
          break

        case 'employees':
          if (filters.employeeStatus) params.append('status', filters.employeeStatus)
          
          response = await fetch(`/api/reports/employees?${params}`, { credentials: 'include' })
          if (!response.ok) throw new Error('Error fetching employees data')
          const employeesData = await response.json()
          
          summaryResponse = await fetch(`/api/reports/employees-summary?${params}`, { credentials: 'include' })
          if (!summaryResponse.ok) throw new Error('Error fetching employees summary')
          const employeesSummary = await summaryResponse.json()
          
          const employeesRows = (employeesData.data || []).map((row: any) => [
            row.employee_code || 'N/A',
            row.name,
            row.position || row.role || 'N/A',
            row.department_name || 'N/A',
            row.status === 'active' ? 'Activo' : row.status === 'inactive' ? 'Inactivo' : 'Terminado',
            row.hire_date || 'N/A'
          ])

          setPreviewData({
            headers: ['Código', 'Nombre', 'Cargo', 'Departamento', 'Estado', 'Fecha Ingreso'],
            rows: employeesRows,
            summary: employeesSummary.summary ? {
              totalEmpleados: employeesSummary.summary.total_employees,
              activos: employeesSummary.summary.active_employees,
              inactivos: employeesSummary.summary.inactive_employees,
              nuevosEsteMes: employeesSummary.summary.new_this_month
            } : undefined,
            totalCount: employeesRows.length
          })
          break

        case 'work_certificate':
          // For now, show mock data - requires employee selection
          const workCertificateMock = generateWorkCertificateMock()
          setPreviewData(workCertificateMock)
          break

        case 'severance':
          // For now, show mock data - requires employee selection
          const severanceMock = generateSeveranceMock()
          setPreviewData(severanceMock)
          break

        default:
          setPreviewData({ headers: [], rows: [] })
      }
    } catch (err) {
      console.error('Error generating preview:', err)
      setError(err instanceof Error ? err.message : 'Error al generar preview')
      setPreviewData(null)
      
      // Fallback to mock data on error
      try {
        const mockData = generateMockData(filters)
        setPreviewData(mockData)
      } catch (mockErr) {
        // If mock also fails, leave previewData as null
      }
    } finally {
      setLoading(false)
    }
  }, [filters, companyId, companyLoading])

  // Auto-generate on filter change
  useEffect(() => {
    if (filters.from && filters.to) {
      generatePreview()
    }
  }, [filters, generatePreview])

  // Usar hook de exportación (similar a payroll)
  const { exportAttendance, exportPayroll, exportEmployees } = useReportsExport()

  const handleExport = useCallback(async (format: 'excel' | 'pdf') => {
    if (!previewData || !companyId) return
    
    try {
      setLoading(true)
      
      // Convertir formatos de fecha
      const startDate = filters.from || new Date().toISOString().split('T')[0]
      const endDate = filters.to || new Date().toISOString().split('T')[0]
      
      if (filters.reportType === 'attendance') {
        await exportAttendance(format, startDate, endDate)
      } else if (filters.reportType === 'payroll') {
        await exportPayroll(format, startDate, endDate)
      } else if (filters.reportType === 'employees') {
        await exportEmployees(format)
      } else {
        throw new Error('Tipo de reporte no soportado')
      }
      
    } catch (err: any) {
      console.error('Export error:', err)
      setError(`Error al exportar ${format}: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }, [filters, previewData, companyId, exportAttendance, exportPayroll, exportEmployees])

  const activeTabConfig = TAB_CONFIG.find(tab => tab.id === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-brand-400" />
            Reportes y Análisis
          </h1>
          <p className="text-gray-300 mt-1">
            Genera reportes detallados de asistencia, nómina y empleados
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportType)}
              className={`
                flex items-center gap-2 px-6 py-3 font-medium transition-all
                ${isActive 
                  ? 'text-brand-400 border-b-2 border-brand-400 bg-white/5' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className={`h-5 w-5 ${isActive ? tab.color : ''}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <Card variant="glass" className="border border-white/10">
        <ReportFilters
          reportType={activeTab}
          filters={filters}
          onFiltersChange={setFilters}
          loading={loading}
        />
      </Card>

      {/* Error State */}
      {error && (
        <Card variant="glass" className="border-red-500/50 bg-red-500/10">
          <div className="p-4 flex items-center gap-2 text-red-300">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Preview Area */}
      {previewData && (
        <>
          {/* KPIs en la parte superior */}
          <ReportKPIs
            summary={previewData.summary}
            reportType={activeTab}
            loading={loading}
          />

          <ExportBar
            data={previewData}
            onExport={handleExport}
            disabled={loading || !!error}
          />
          
          <ReportPreview
            data={previewData}
            loading={loading}
            reportType={activeTab}
          />
        </>
      )}

      {/* Empty State */}
      {!previewData && !loading && !error && (
        <Card variant="glass" className="border border-white/10">
          <div className="p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Selecciona filtros para generar tu reporte
            </h3>
            <p className="text-gray-400">
              Configura el rango de fechas, empleados y otros filtros arriba para ver tu reporte
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

// Mock data generator for preview
function generateMockData(filters: ReportFilters): PreviewData {
  const { reportType, periodicity, from, to } = filters
  
  switch (reportType) {
    case 'attendance':
      return generateAttendanceMock()
    case 'payroll':
      return generatePayrollMock()
    case 'employees':
      return generateEmployeesMock()
    case 'work_certificate':
      return generateWorkCertificateMock()
    case 'severance':
      return generateSeveranceMock()
    default:
      return { headers: [], rows: [] }
  }
}

function generateAttendanceMock(): PreviewData {
  return {
    headers: ['Empleado', 'Fecha', 'Check-in', 'Check-out', 'Estado', 'Horas', 'Tardanza'],
    rows: [
      ['Juan Pérez', '2025-01-15', '07:55', '16:45', 'Presente', '8.0h', '0 min'],
      ['María González', '2025-01-15', '08:05', '16:50', 'Presente', '8.0h', '5 min'],
      ['Carlos López', '2025-01-15', '08:15', '17:00', 'Presente', '8.0h', '15 min'],
      ['Ana Martínez', '2025-01-15', '--', '--', 'Ausente', '0h', '--'],
      ['Pedro Rodríguez', '2025-01-15', '08:02', '16:48', 'Presente', '8.0h', '2 min'],
    ],
    summary: {
      totalRegistros: 50,
      presentes: 45,
      ausentes: 5,
      tardes: 8,
      asistenciaPct: 90,
      puntualidadPct: 82
    },
    totalCount: 50
  }
}

function generatePayrollMock(): PreviewData {
  return {
    headers: ['Empleado', 'Período', 'Devengado', 'Deducciones', 'Neto', 'Estado'],
    rows: [
      ['Juan Pérez', 'Ene 2025 (1)', 'L 15,000', 'L 2,500', 'L 12,500', 'Pagado'],
      ['María González', 'Ene 2025 (1)', 'L 18,000', 'L 2,900', 'L 15,100', 'Pagado'],
      ['Carlos López', 'Ene 2025 (1)', 'L 12,000', 'L 2,000', 'L 10,000', 'Pendiente'],
      ['Ana Martínez', 'Ene 2025 (1)', 'L 20,000', 'L 3,200', 'L 16,800', 'Pagado'],
      ['Pedro Rodríguez', 'Ene 2025 (1)', 'L 16,500', 'L 2,700', 'L 13,800', 'Pagado'],
    ],
    summary: {
      totalDevengado: 'L 250,000',
      totalDeducciones: 'L 42,000',
      totalNeto: 'L 208,000',
      empleados: 25,
      pagosPendientes: 3
    },
    totalCount: 25
  }
}

function generateEmployeesMock(): PreviewData {
  return {
    headers: ['Código', 'Nombre', 'Cargo', 'Departamento', 'Estado', 'Fecha Ingreso'],
    rows: [
      ['EMP-001', 'Juan Pérez', 'Desarrollador Senior', 'TI', 'Activo', '2023-01-15'],
      ['EMP-002', 'María González', 'Analista de RH', 'RRHH', 'Activo', '2022-06-01'],
      ['EMP-003', 'Carlos López', 'Contador', 'Finanzas', 'Activo', '2023-03-20'],
      ['EMP-004', 'Ana Martínez', 'Gerente de Ventas', 'Ventas', 'Inactivo', '2021-11-10'],
      ['EMP-005', 'Pedro Rodríguez', 'Asistente Administrativo', 'Admin', 'Activo', '2023-08-05'],
    ],
    summary: {
      totalEmpleados: 45,
      activos: 42,
      inactivos: 3,
      nuevosEsteMes: 2
    },
    totalCount: 45
  }
}

function generateWorkCertificateMock(): PreviewData {
  return {
    headers: ['Empleado', 'Cargo', 'Antigüedad', 'Salario', 'Generado', 'Acciones'],
    rows: [
      ['Juan Pérez', 'Desarrollador Senior', '2 años', 'L 15,000', '2025-01-10', 'Ver PDF'],
      ['María González', 'Analista de RH', '2.5 años', 'L 18,000', '2025-01-08', 'Ver PDF'],
      ['Carlos López', 'Contador', '1.8 años', 'L 12,000', '2025-01-05', 'Ver PDF'],
    ],
    summary: {
      totalConstancias: 12,
      generadasEsteMes: 5,
      pendientes: 2
    },
    totalCount: 12
  }
}

function generateSeveranceMock(): PreviewData {
  return {
    headers: ['Empleado', 'Fecha Ingreso', 'Fecha Salida', 'Antigüedad', 'Salario Base', 'Liquidación'],
    rows: [
      ['Ana Martínez', '2021-11-10', '2025-01-31', '3.25 años', 'L 20,000', 'L 78,000'],
      ['Luis Sánchez', '2020-05-15', '2025-01-31', '4.7 años', 'L 22,000', 'L 103,400'],
    ],
    summary: {
      totalLiquidaciones: 5,
      montoTotal: 'L 450,000',
      periodoCalculado: 'Ene 2025'
    },
    totalCount: 5
  }
}

