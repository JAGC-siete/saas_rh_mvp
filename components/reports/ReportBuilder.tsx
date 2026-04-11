import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import ReportFilters from './ReportFilters'
import ReportPreview from './ReportPreview'
import ReportKPIs from './ReportKPIs'
import ExportBar from './ExportBar'
import { formatTimeDisplay, parseDateOnlyAsHonduras, HONDURAS_TIMEZONE } from '../../lib/timezone'
import { useCompanyContext } from '../../lib/useCompanyContext'
import { useReportsExport } from '../../lib/hooks/useReportsExport'
import { downloadPreviewAsCsv } from '../../lib/reports/download-preview-csv'
import {
  Calendar,
  Clock,
  FileText,
  Users,
  DollarSign,
  ClipboardList,
  TrendingUp
} from 'lucide-react'
import { REPORT_TYPE_OPTIONS, type ReportType } from '../../lib/reports/report-config-schema'
import {
  getReportExportCapabilities,
  reportNeedsDateRange,
  reportSubtitle
} from '../../lib/reports/report-ui-capabilities'

export type { ReportType }
export type Periodicity = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'custom'

export interface ReportFilters {
  reportType: ReportType
  periodicity: Periodicity
  from?: string
  to?: string
  employeeIds?: string[]
  departmentIds?: string[]
  attendanceStatus?: ('present' | 'absent' | 'late' | 'permission')[]
  payrollType?: 'all' | 'regular' | 'overtime'
  employeeStatus?: 'active' | 'inactive' | 'all'
  certificateDate?: string
  terminationDate?: string
}

export interface PreviewData {
  headers: string[]
  rows: any[]
  summary?: Record<string, any>
  totalCount?: number
}

const TAB_ICONS: Record<ReportType, typeof Clock> = {
  attendance: Clock,
  payroll: DollarSign,
  employees: Users,
  work_certificate: FileText,
  severance: ClipboardList
}

const TAB_COLORS: Record<ReportType, string> = {
  attendance: 'text-blue-400',
  payroll: 'text-green-400',
  employees: 'text-purple-400',
  work_certificate: 'text-yellow-400',
  severance: 'text-orange-400'
}

const TAB_CONFIG = REPORT_TYPE_OPTIONS.map(({ value: id, label }) => ({
  id,
  label,
  icon: TAB_ICONS[id],
  color: TAB_COLORS[id]
}))

function formatHnl(n: number | string | null | undefined): string {
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  return `L ${num.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ReportBuilder() {
  const { companyId, loading: companyLoading } = useCompanyContext()
  const [activeTab, setActiveTab] = useState<ReportType>('attendance')
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    reportType: 'attendance',
    periodicity: 'fortnightly',
    payrollType: 'all',
    employeeStatus: 'all'
  }))
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      reportType: activeTab,
      periodicity: prev.periodicity || 'fortnightly',
      payrollType: activeTab === 'payroll' ? prev.payrollType ?? 'all' : prev.payrollType
    }))
  }, [activeTab])

  const exportCaps = useMemo(() => getReportExportCapabilities(activeTab), [activeTab])

  const buildListParams = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.from) params.append('from', filters.from)
    if (filters.to) params.append('to', filters.to)
    if (filters.employeeIds?.length) params.append('employeeIds', filters.employeeIds.join(','))
    if (filters.departmentIds?.length) params.append('departmentIds', filters.departmentIds.join(','))
    return params
  }, [filters.from, filters.to, filters.employeeIds, filters.departmentIds])

  const generatePreview = useCallback(async () => {
    if (!companyId || companyLoading) {
      setError('Cargando información de empresa...')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = buildListParams()

      switch (filters.reportType) {
        case 'attendance': {
          if (filters.attendanceStatus?.length) {
            params.append('status', filters.attendanceStatus.join(','))
          }
          const response = await fetch(`/api/reports/attendance?${params}`, { credentials: 'include' })
          if (!response.ok) throw new Error('Error al cargar asistencia')
          const attendanceData = await response.json()

          const summaryResponse = await fetch(`/api/reports/attendance-summary?${params}`, {
            credentials: 'include'
          })
          if (!summaryResponse.ok) throw new Error('Error al cargar resumen de asistencia')
          const attendanceSummary = await summaryResponse.json()

          const attendanceRows = (attendanceData.data || []).map((row: any) => [
            row.employee_name,
            row.date,
            row.check_in ? formatTimeDisplay(row.check_in) : '--',
            row.check_out ? formatTimeDisplay(row.check_out) : '--',
            row.status,
            row.hours_worked ? `${Number(row.hours_worked).toFixed(1)}h` : '0h',
            row.late_minutes !== null && row.late_minutes !== undefined ? `${row.late_minutes} min` : '--'
          ])

          setPreviewData({
            headers: ['Empleado', 'Fecha', 'Check-in', 'Check-out', 'Estado', 'Horas', 'Tardanza'],
            rows: attendanceRows,
            summary: attendanceSummary.summary
              ? {
                  totalRegistros: attendanceSummary.summary.total_records,
                  presentes: attendanceSummary.summary.present_count,
                  ausentes: attendanceSummary.summary.absent_count,
                  tardes: attendanceSummary.summary.late_count,
                  asistenciaPct: attendanceSummary.summary.attendance_rate,
                  puntualidadPct: attendanceSummary.summary.punctuality_rate
                }
              : undefined,
            totalCount: attendanceRows.length
          })
          break
        }

        case 'payroll': {
          params.append('payrollType', filters.payrollType ?? 'all')
          const response = await fetch(`/api/reports/payroll?${params}`, { credentials: 'include' })
          if (!response.ok) throw new Error('Error al cargar nómina')
          const payrollData = await response.json()

          const summaryResponse = await fetch(`/api/reports/payroll-summary?${params}`, {
            credentials: 'include'
          })
          if (!summaryResponse.ok) throw new Error('Error al cargar resumen de nómina')
          const payrollSummary = await summaryResponse.json()

          const payrollRows = (payrollData.data || []).map((row: any) => [
            row.employee_name,
            `${parseDateOnlyAsHonduras(row.period_start).toLocaleDateString('es-HN', {
              timeZone: HONDURAS_TIMEZONE,
              month: 'short',
              day: 'numeric'
            })} - ${parseDateOnlyAsHonduras(row.period_end).toLocaleDateString('es-HN', {
              timeZone: HONDURAS_TIMEZONE,
              month: 'short',
              day: 'numeric'
            })}`,
            formatHnl(row.gross_salary),
            formatHnl(row.total_deductions),
            formatHnl(row.net_salary),
            row.status === 'paid' ? 'Pagado' : row.status === 'approved' ? 'Aprobado' : 'Borrador'
          ])

          setPreviewData({
            headers: ['Empleado', 'Período', 'Devengado', 'Deducciones', 'Neto', 'Estado'],
            rows: payrollRows,
            summary: payrollSummary.summary
              ? {
                  totalDevengado: formatHnl(payrollSummary.summary.total_gross_salary),
                  totalDeducciones: formatHnl(payrollSummary.summary.total_deductions),
                  totalNeto: formatHnl(payrollSummary.summary.total_net_salary),
                  empleados: payrollSummary.summary.total_employees,
                  pagosPendientes:
                    (payrollSummary.summary.pending_count || 0) +
                    (payrollSummary.summary.draft_count || 0)
                }
              : undefined,
            totalCount: payrollRows.length
          })
          break
        }

        case 'employees': {
          const empParams = new URLSearchParams()
          if (filters.employeeStatus) empParams.append('status', filters.employeeStatus)
          if (filters.departmentIds?.length) {
            empParams.append('departmentIds', filters.departmentIds.join(','))
          }

          const response = await fetch(`/api/reports/employees?${empParams}`, { credentials: 'include' })
          if (!response.ok) throw new Error('Error al cargar empleados')
          const employeesData = await response.json()

          const summaryParams = new URLSearchParams()
          if (filters.departmentIds?.length) {
            summaryParams.append('departmentIds', filters.departmentIds.join(','))
          }
          const summaryResponse = await fetch(`/api/reports/employees-summary?${summaryParams}`, {
            credentials: 'include'
          })
          if (!summaryResponse.ok) throw new Error('Error al cargar resumen de empleados')
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
            headers: ['Código', 'Nombre', 'Cargo', 'Departamento', 'Estado', 'Fecha ingreso'],
            rows: employeesRows,
            summary: employeesSummary.summary
              ? {
                  totalEmpleados: employeesSummary.summary.total_employees,
                  activos: employeesSummary.summary.active_employees,
                  inactivos: employeesSummary.summary.inactive_employees,
                  nuevosEsteMes: employeesSummary.summary.new_this_month
                }
              : undefined,
            totalCount: employeesRows.length
          })
          break
        }

        case 'work_certificate': {
          const empId = filters.employeeIds?.[0]
          if (!empId) {
            setPreviewData(null)
            break
          }
          const q = new URLSearchParams({ employeeId: empId })
          if (filters.certificateDate) q.append('date', filters.certificateDate)
          const response = await fetch(`/api/reports/work-certificate?${q}`, { credentials: 'include' })
          if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            throw new Error(err.message || err.error || 'No se pudo cargar la constancia')
          }
          const json = await response.json()
          const d = json.data
          const tenureLabel =
            d.years_tenure != null || d.months_tenure != null
              ? `${d.years_tenure ?? 0}a ${d.months_tenure ?? 0}m`
              : '—'

          setPreviewData({
            headers: ['Campo', 'Valor'],
            rows: [
              ['Empleado', d.employee_name],
              ['DNI', d.dni],
              ['Cargo', d.position],
              ['Departamento', d.department_name],
              ['Fecha ingreso', d.hire_date],
              ['Salario base', formatHnl(d.base_salary)],
              ['Empresa', d.company_name],
              ['Antigüedad (aprox.)', tenureLabel],
              ['Fecha constancia', d.certificate_date]
            ],
            summary: {
              totalConstancias: 1,
              generadasEsteMes: '—',
              pendientes: '—'
            },
            totalCount: 1
          })
          break
        }

        case 'severance': {
          const empId = filters.employeeIds?.[0]
          const term = filters.terminationDate
          if (!empId || !term) {
            setPreviewData(null)
            break
          }
          const response = await fetch('/api/reports/severance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ employeeId: empId, terminationDate: term })
          })
          if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            throw new Error(err.message || err.error || 'Error al calcular liquidación')
          }
          const json = await response.json()
          const d = json.data

          setPreviewData({
            headers: ['Concepto', 'Valor'],
            rows: [
              ['Empleado', d.employee_name],
              ['DNI', d.dni],
              ['Fecha ingreso', d.hire_date],
              ['Fecha terminación', d.termination_date],
              ['Años servicio', d.years_tenure],
              ['Salario promedio', formatHnl(d.average_salary)],
              ['Cesantía', formatHnl(d.severance_amount)],
              ['Vacaciones', formatHnl(d.vacation_balance)],
              ['Total liquidación', formatHnl(d.total_settlement)]
            ],
            summary: {
              totalLiquidaciones: 1,
              montoTotal: formatHnl(d.total_settlement),
              periodoCalculado: term
            },
            totalCount: 1
          })
          break
        }

        default:
          setPreviewData({ headers: [], rows: [] })
      }
    } catch (err) {
      console.error('Error generating preview:', err)
      setError(err instanceof Error ? err.message : 'Error al generar vista previa')
      setPreviewData(null)
    } finally {
      setLoading(false)
    }
  }, [filters, companyId, companyLoading, buildListParams])

  useEffect(() => {
    if (!companyId || companyLoading) return

    if (reportNeedsDateRange(filters.reportType)) {
      if (!filters.from || !filters.to) {
        setPreviewData(null)
        return
      }
    }

    if (filters.reportType === 'work_certificate' && !filters.employeeIds?.length) {
      setPreviewData(null)
      return
    }

    if (
      filters.reportType === 'severance' &&
      (!filters.employeeIds?.length || !filters.terminationDate)
    ) {
      setPreviewData(null)
      return
    }

    generatePreview()
  }, [filters, companyId, companyLoading, generatePreview])

  const { exportAttendance, exportPayroll, exportEmployees, exportWorkCertificate } = useReportsExport()

  const handleExport = useCallback(
    async (format: 'excel' | 'pdf' | 'csv') => {
      if (!companyId) return
      setError(null)

      if (format === 'csv' && filters.reportType === 'severance') {
        if (!previewData?.headers?.length) return
        downloadPreviewAsCsv(
          previewData.headers,
          previewData.rows,
          `liquidacion_${filters.terminationDate || 'fecha'}.csv`
        )
        return
      }

      if (filters.reportType === 'work_certificate') {
        const id = filters.employeeIds?.[0]
        if (!id) throw new Error('Selecciona un empleado')
        if (format === 'excel') return
        await exportWorkCertificate(id, format === 'pdf' ? 'pdf' : 'csv')
        return
      }

      if (!previewData) return

      const startDate = filters.from || new Date().toISOString().split('T')[0]
      const endDate = filters.to || new Date().toISOString().split('T')[0]

      if (filters.reportType === 'attendance') {
        await exportAttendance(format, startDate, endDate)
      } else if (filters.reportType === 'payroll') {
        await exportPayroll(format, startDate, endDate)
      } else if (filters.reportType === 'employees') {
        if (format === 'csv') {
          throw new Error('CSV no disponible en este flujo; usa Excel o PDF.')
        }
        await exportEmployees(format)
      } else {
        throw new Error('Exportación no disponible para este reporte')
      }
    },
    [
      filters,
      previewData,
      companyId,
      exportAttendance,
      exportPayroll,
      exportEmployees,
      exportWorkCertificate
    ]
  )

  const emptyMessage = useMemo(() => {
    switch (activeTab) {
      case 'attendance':
      case 'payroll':
        return {
          title: 'Define un rango de fechas',
          body: 'Elige inicio y fin (o un preset de período) para generar la vista previa.'
        }
      case 'employees':
        return {
          title: 'Sin datos en vista previa',
          body: 'Ajusta estado o departamento, o verifica permisos si la lista sale vacía.'
        }
      case 'work_certificate':
        return {
          title: 'Selecciona un empleado',
          body: 'La constancia es por persona. Elige un empleado activo para ver datos y exportar PDF o CSV.'
        }
      case 'severance':
        return {
          title: 'Empleado y fecha de terminación',
          body: 'Selecciona empleado e indica la fecha de terminación para calcular y exportar la liquidación (CSV).'
        }
      default:
        return {
          title: 'Configura los filtros',
          body: ''
        }
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-brand-400" />
            Reportes y análisis
          </h1>
          <p className="text-gray-300 mt-1 max-w-3xl">{reportSubtitle(activeTab)}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ReportType)}
              className={`
                flex items-center gap-2 px-6 py-3 font-medium transition-all whitespace-nowrap
                ${
                  isActive
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

      <Card variant="glass" className="border border-white/10">
        <ReportFilters
          reportType={activeTab}
          filters={filters}
          onFiltersChange={setFilters}
          loading={loading}
        />
      </Card>

      {error && (
        <Card variant="glass" className="border-red-500/50 bg-red-500/10">
          <div className="p-4 flex items-center gap-2 text-red-300">
            <span className="text-xl" aria-hidden>
              ⚠️
            </span>
            <span>{error}</span>
          </div>
        </Card>
      )}

      {previewData && (
        <>
          <ReportKPIs summary={previewData.summary} reportType={activeTab} loading={loading} />

          <ExportBar
            data={previewData}
            onExport={handleExport}
            disabled={loading || !!error}
            capabilities={exportCaps}
            onExportError={(msg) => setError(msg)}
          />

          <ReportPreview data={previewData} loading={loading} reportType={activeTab} />
        </>
      )}

      {!previewData && !loading && !error && (
        <Card variant="glass" className="border border-white/10">
          <div className="p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">{emptyMessage.title}</h3>
            <p className="text-gray-400 max-w-md mx-auto">{emptyMessage.body}</p>
          </div>
        </Card>
      )}
    </div>
  )
}
