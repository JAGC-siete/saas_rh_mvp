import { useState, useEffect, useCallback } from 'react'
import { ReportFilters as ReportFiltersType, ReportType, Periodicity } from './ReportBuilder'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { nowInHonduras } from '../../lib/timezone'
import { reportNeedsDateRange } from '../../lib/reports/report-ui-capabilities'

interface ReportFiltersProps {
  reportType: ReportType
  filters: ReportFiltersType
  onFiltersChange: (filters: ReportFiltersType) => void
  loading?: boolean
}

const PERIODICITY_PRESETS = [
  { label: 'Hoy', value: 'daily', icon: '📅' },
  { label: 'Esta Semana', value: 'weekly', icon: '📆' },
  { label: 'Esta Quincena', value: 'fortnightly', icon: '📋' },
  { label: 'Este Mes', value: 'monthly', icon: '🗓️' },
  { label: 'Rango Personalizado', value: 'custom', icon: '🗓️' }
] as const

export default function ReportFilters({
  reportType,
  filters,
  onFiltersChange,
  loading = false
}: ReportFiltersProps) {
  const [employees, setEmployees] = useState<{ id: string; name: string; code: string }[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [payrollRuns, setPayrollRuns] = useState<{ id: string; label: string }[]>([])
  const [derivedConcepts, setDerivedConcepts] = useState<{ code: string; label: string }[]>([])

  const loadFilterOptions = useCallback(async () => {
    setLoadError(null)
    try {
      let list: { id: string; name: string; code: string }[] = []
      const empRes = await fetch('/api/employees', { credentials: 'include' })
      if (empRes.ok) {
        const j = await empRes.json()
        list = (j.employees || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          code: e.employee_code || e.dni || ''
        }))
      } else {
        const searchRes = await fetch('/api/employees/search?limit=2000&status=active', {
          credentials: 'include'
        })
        if (searchRes.ok) {
          const j = await searchRes.json()
          list = (j.employees || []).map((e: any) => ({
            id: e.id,
            name: e.name,
            code: e.employee_code || e.dni || ''
          }))
        }
      }
      setEmployees(list)

      const deptRes = await fetch('/api/departments', { credentials: 'include' })
      if (deptRes.ok) {
        const j = await deptRes.json()
        setDepartments(j.departments || [])
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
      setLoadError('No se pudieron cargar empleados o departamentos. Revisa tu sesión y permisos.')
    }
  }, [])

  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  const loadPayrollDerivedOptions = useCallback(async () => {
    try {
      const [runsRes, conceptsRes] = await Promise.all([
        fetch('/api/reports/payroll-runs?limit=50', { credentials: 'include' }),
        fetch('/api/reports/payroll-derived-concepts', { credentials: 'include' })
      ])

      if (runsRes.ok) {
        const j = await runsRes.json()
        setPayrollRuns((j.runs || []).map((r: any) => ({ id: r.id, label: r.label })))
      }

      if (conceptsRes.ok) {
        const j = await conceptsRes.json()
        setDerivedConcepts((j.concepts || []).map((c: any) => ({ code: c.code, label: c.label })))
      }
    } catch (e) {
      // Silent; user can retry by re-opening filters
    }
  }, [])

  useEffect(() => {
    if (reportType !== 'payroll') return
    if ((filters.payrollView ?? 'lines') !== 'derived') return
    loadPayrollDerivedOptions()
  }, [reportType, filters.payrollView, loadPayrollDerivedOptions])

  const setDefaultDateRange = (periodicity: Periodicity) => {
    const now = nowInHonduras()
    let from = ''
    const to = now.toISOString().split('T')[0]

    switch (periodicity) {
      case 'daily':
        from = now.toISOString().split('T')[0]
        break
      case 'weekly': {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        from = weekStart.toISOString().split('T')[0]
        break
      }
      case 'fortnightly': {
        const fortnightStart = new Date(now)
        const dayOfMonth = now.getDate()
        if (dayOfMonth <= 15) {
          fortnightStart.setDate(1)
        } else {
          fortnightStart.setDate(16)
        }
        from = fortnightStart.toISOString().split('T')[0]
        break
      }
      case 'monthly':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        break
      case 'custom':
        if (!filters.from) {
          from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        }
        break
    }

    if (from) {
      onFiltersChange({ ...filters, from, to })
    }
  }

  useEffect(() => {
    if (!reportNeedsDateRange(reportType)) return
    if (!filters.from || !filters.to) {
      setDefaultDateRange(filters.periodicity)
    }
    // Solo reaccionar a periodicidad / tipo con rango; no incluir from/to para no pisar al usuario
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional
  }, [filters.periodicity, reportType])

  const handlePeriodicityChange = (periodicity: Periodicity) => {
    onFiltersChange({ ...filters, periodicity })
    const now = nowInHonduras()
    const to = now.toISOString().split('T')[0]
    let from = ''
    switch (periodicity) {
      case 'daily':
        from = to
        break
      case 'weekly': {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        from = weekStart.toISOString().split('T')[0]
        break
      }
      case 'fortnightly': {
        const fortnightStart = new Date(now)
        const dayOfMonth = now.getDate()
        fortnightStart.setDate(dayOfMonth <= 15 ? 1 : 16)
        from = fortnightStart.toISOString().split('T')[0]
        break
      }
      case 'monthly':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        break
      case 'custom':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        break
    }
    if (from) onFiltersChange({ ...filters, periodicity, from, to })
  }

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      employeeIds: undefined,
      departmentIds: undefined,
      attendanceStatus: undefined,
      certificateDate: undefined,
      terminationDate: undefined,
      payrollRunId: undefined,
      payrollDerivedConcept: undefined,
      payrollType: filters.reportType === 'payroll' ? 'all' : filters.payrollType,
      from: '',
      to: ''
    })
  }

  const needsEmployeePick = reportType === 'work_certificate' || reportType === 'severance'

  const hasActiveFilters = !!(
    filters.employeeIds?.length ||
    filters.departmentIds?.length ||
    filters.attendanceStatus?.length ||
    filters.certificateDate ||
    filters.terminationDate ||
    filters.payrollRunId ||
    filters.payrollDerivedConcept ||
    (reportType === 'payroll' && filters.payrollType && filters.payrollType !== 'all')
  )

  const showDateRange =
    reportNeedsDateRange(reportType) && !(reportType === 'payroll' && (filters.payrollView ?? 'lines') === 'derived')
  const showPeriodPresets = showDateRange

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Filtros</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <XMarkIcon className="h-4 w-4" />
            Limpiar filtros secundarios
          </button>
        )}
      </div>

      {loadError && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          {loadError}
        </div>
      )}

      {reportType === 'payroll' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Vista</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    payrollView: 'lines',
                    payrollRunId: undefined,
                    payrollDerivedConcept: undefined
                  })
                }
                disabled={loading}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${(filters.payrollView ?? 'lines') === 'lines'
                    ? 'bg-brand-600 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                Nómina (líneas)
              </button>
              <button
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    payrollView: 'derived',
                    payrollType: 'all',
                    from: '',
                    to: ''
                  })
                }
                disabled={loading}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${(filters.payrollView ?? 'lines') === 'derived'
                    ? 'bg-brand-600 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                Derivados de nómina
              </button>
            </div>
          </div>

          {(filters.payrollView ?? 'lines') === 'lines' && (
            <p className="text-xs text-gray-400 mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              El PDF consolidado de nómina se genera según la <strong className="text-gray-300">quincena</strong>{' '}
              inferida de la <strong className="text-gray-300">fecha de inicio</strong> del rango (no es un PDF del
              mismo corte que la tabla si el rango abarca varias quincenas).
            </p>
          )}
        </>
      )}

      {reportType === 'payroll' && (filters.payrollView ?? 'lines') === 'derived' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Corrida ejecutada <span className="text-brand-400">*</span>
            </label>
            <select
              value={filters.payrollRunId || ''}
              onChange={(e) => onFiltersChange({ ...filters, payrollRunId: e.target.value || undefined })}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
            >
              <option value="" className="bg-gray-800 text-gray-400">
                Selecciona una corrida
              </option>
              {payrollRuns.map((r) => (
                <option key={r.id} value={r.id} className="bg-gray-800">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Concepto/Institución <span className="text-brand-400">*</span>
            </label>
            <select
              value={filters.payrollDerivedConcept || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, payrollDerivedConcept: e.target.value || undefined })
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
            >
              <option value="" className="bg-gray-800 text-gray-400">
                Selecciona un concepto
              </option>
              {derivedConcepts.map((c) => (
                <option key={c.code} value={c.code} className="bg-gray-800">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {reportType === 'employees' && (
        <p className="text-xs text-gray-400 mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          Este listado usa el estado y departamento; el rango de fechas no aplica a la consulta de empleados.
        </p>
      )}

      {reportType === 'work_certificate' && (
        <p className="text-xs text-gray-400 mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          La vista previa usa datos de empleados <strong className="text-gray-300">activos</strong>. La descarga PDF/CSV
          puede incluir más detalle (p. ej. deducciones).
        </p>
      )}

      {reportType === 'severance' && (
        <p className="text-xs text-gray-400 mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          Indica la fecha de terminación para calcular cesantía y vacaciones según el motor del sistema. Exporta el
          resultado como CSV desde la vista previa.
        </p>
      )}

      {showPeriodPresets && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Período</label>
          <div className="flex flex-wrap gap-2">
            {PERIODICITY_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePeriodicityChange(preset.value as Periodicity)}
                disabled={loading}
                className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${filters.periodicity === preset.value
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              >
                {preset.icon} {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDateRange && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Fecha inicio</label>
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Fecha fin</label>
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {(reportType === 'work_certificate' || reportType === 'severance') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Empleado {needsEmployeePick && <span className="text-brand-400">*</span>}
          </label>
          <select
            value={filters.employeeIds?.[0] || ''}
            onChange={(e) => {
              onFiltersChange({
                ...filters,
                employeeIds: e.target.value ? [e.target.value] : undefined
              })
            }}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
          >
            <option value="" className="bg-gray-800 text-gray-400">
              Selecciona un empleado
            </option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id} className="bg-gray-800">
                {emp.name}
                {emp.code ? ` (${emp.code})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {reportType === 'work_certificate' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fecha de la constancia (antigüedad)
          </label>
          <input
            type="date"
            value={filters.certificateDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, certificateDate: e.target.value || undefined })}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">Opcional. Si la dejas vacía se usa la fecha de hoy.</p>
        </div>
      )}

      {reportType === 'severance' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fecha de terminación <span className="text-brand-400">*</span>
          </label>
          <input
            type="date"
            value={filters.terminationDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, terminationDate: e.target.value || undefined })}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
          />
        </div>
      )}

      {(reportType === 'attendance' || reportType === 'payroll') && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Empleado</label>
            <select
              value={filters.employeeIds?.[0] || ''}
              onChange={(e) => {
                onFiltersChange({
                  ...filters,
                  employeeIds: e.target.value ? [e.target.value] : undefined
                })
              }}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
            >
              <option value="" className="bg-gray-800 text-gray-400">
                Todos los empleados
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id} className="bg-gray-800">
                  {emp.name}
                  {emp.code ? ` (${emp.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Departamento</label>
            <select
              value={filters.departmentIds?.[0] || ''}
              onChange={(e) => {
                onFiltersChange({
                  ...filters,
                  departmentIds: e.target.value ? [e.target.value] : undefined
                })
              }}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
            >
              <option value="" className="bg-gray-800 text-gray-400">
                Todos los departamentos
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="bg-gray-800">
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {reportType === 'employees' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Departamento</label>
            <select
              value={filters.departmentIds?.[0] || ''}
              onChange={(e) => {
                onFiltersChange({
                  ...filters,
                  departmentIds: e.target.value ? [e.target.value] : undefined
                })
              }}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
            >
              <option value="" className="bg-gray-800 text-gray-400">
                Todos los departamentos
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="bg-gray-800">
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Estado del empleado</label>
            <select
              value={filters.employeeStatus || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, employeeStatus: e.target.value as any })}
              disabled={loading}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            >
              <option value="all" className="bg-gray-800">
                Todos
              </option>
              <option value="active" className="bg-gray-800">
                Solo activos
              </option>
              <option value="inactive" className="bg-gray-800">
                Solo inactivos
              </option>
            </select>
          </div>
        </>
      )}

      {reportType === 'payroll' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de nómina (vista previa)</label>
          <select
            value={filters.payrollType || 'all'}
            onChange={(e) => onFiltersChange({ ...filters, payrollType: e.target.value as any })}
            disabled={loading}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          >
            <option value="all" className="bg-gray-800">
              Todas
            </option>
            <option value="regular" className="bg-gray-800">
              Regular
            </option>
            <option value="overtime" className="bg-gray-800">
              Horas extra
            </option>
          </select>
        </div>
      )}

      {reportType === 'attendance' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Estado en tabla <span className="text-gray-500 text-xs font-normal">(el resumen KPI puede seguir siendo global)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(['present', 'absent', 'late', 'permission'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  const currentStatuses = filters.attendanceStatus || []
                  const newStatuses = currentStatuses.includes(status)
                    ? currentStatuses.filter((s) => s !== status)
                    : [...currentStatuses, status]
                  onFiltersChange({ ...filters, attendanceStatus: newStatuses })
                }}
                disabled={loading}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${filters.attendanceStatus?.includes(status)
                    ? 'bg-brand-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }
                  disabled:opacity-50
                `}
              >
                {status === 'present' && 'Presente'}
                {status === 'absent' && 'Ausente'}
                {status === 'late' && 'Tarde'}
                {status === 'permission' && 'Permiso'}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {filters.employeeIds?.map((id) => {
              const emp = employees.find((e) => e.id === id)
              return (
                emp && (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/20 text-brand-300 text-xs rounded-full"
                  >
                    {emp.name}
                    <button
                      type="button"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          employeeIds: filters.employeeIds?.filter((eid) => eid !== id)
                        })
                      }
                      className="hover:text-brand-100"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )
              )
            })}
            {filters.departmentIds?.map((id) => {
              const dept = departments.find((d) => d.id === id)
              return (
                dept && (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-300 text-xs rounded-full"
                  >
                    {dept.name}
                    <button
                      type="button"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          departmentIds: filters.departmentIds?.filter((did) => did !== id)
                        })
                      }
                      className="hover:text-slate-100"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
