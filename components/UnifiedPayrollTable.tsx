// Unified Payroll Table Component
// Combines planilla and detalle data in a single expandable table

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Icon, IconName } from './Icon'
import { formatCurrency } from '../lib/utils/currency'
import { UnifiedRow, UnifiedResumen } from '../lib/payroll-unified'
import {
  resolveStatutoryDeductionColumns,
  type CustomFieldConfigEntry
} from '../lib/payroll/statutory-deduction-columns'
// // import { extractCustomFields, calculatePayroll } from '../lib/payroll-client-specific'
import { createClient } from '../lib/supabase/client'
import { Pagination } from './ui/pagination'
import PayrollFixedTable from './PayrollFixedTable'
import PayrollHourlyTable from './PayrollHourlyTable'

export type IncompleteRecordAlert = { employee_id: string; employee_name: string; dates: string[] }

interface UnifiedPayrollTableProps {
  rows: UnifiedRow[]
  resumen: UnifiedResumen
  incompleteRecordsAlert?: IncompleteRecordAlert[]
  // eslint-disable-next-line no-unused-vars
  onPreviewVoucher: (_lineId: string) => void
  // eslint-disable-next-line no-unused-vars
  onGenerateVoucher: (_lineId: string) => void
  onPreAuthorize?: () => void
  onAuthorize: () => void
  onOpenPlanillaPreview?: () => void
  onSendEmail: () => void
  // eslint-disable-next-line no-unused-vars
  onEditCustomFields?: (_lineId: string, _metadata: any, _baseSalary: number, _employeeId?: string) => void
  canAdjustFixedDays?: boolean
  payrollRunStatus?: string
  // eslint-disable-next-line no-unused-vars
  onAdjustFixedDays?: (_payload: {
    run_line_id: string
    days_worked: number
    reason?: string
  }) => Promise<void>
  onResetLineRecalc?: (_runLineId: string) => Promise<void>
  canResetLineRecalc?: boolean
  loading?: boolean
  canAuthorize?: boolean
  canSend?: boolean
  isBulkEmailBlocked?: boolean
  bulkEmailBlockedMessage?: string
  runId?: string
  status?: string
  period: {
    year: number
    month: number
    quincena: number
  }
  companyId?: string
  payrollApiConfig?: {
    legal_deductions?: { ihss?: boolean; rap?: boolean; isr?: boolean }
    custom_fields?: Record<string, unknown>
  } | null
}

export default function UnifiedPayrollTable({
  rows,
  resumen,
  incompleteRecordsAlert = [],
  onPreviewVoucher,
  onGenerateVoucher,
  onPreAuthorize,
  onAuthorize,
  onOpenPlanillaPreview,
  onSendEmail,
  onEditCustomFields,
  canAdjustFixedDays = false,
  payrollRunStatus,
  onAdjustFixedDays,
  onResetLineRecalc,
  canResetLineRecalc = false,
  loading = false,
  // eslint-disable-next-line no-unused-vars
  canAuthorize: _canAuthorize = false,
  canSend = false,
  isBulkEmailBlocked = false,
  bulkEmailBlockedMessage,
  runId,
  status,
  period,
  companyId,
  payrollApiConfig = null
}: UnifiedPayrollTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [currentPageFixed, setCurrentPageFixed] = useState(1)
  const [currentPageHourly, setCurrentPageHourly] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [sortBy, setSortBy] = useState<'name' | 'department'>('name')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [hasCustom, setHasCustom] = useState(false)
  // eslint-disable-next-line no-unused-vars
  const [_payrollConfig, setPayrollConfig] = useState<any>(null)
  
  // Load payroll configuration async
  useEffect(() => {
    async function loadConfig() {
      if (!companyId) {
        setHasCustom(false)
        setPayrollConfig(null)
        return
      }
      
      try {
        const supabase = createClient()
        const { hasCustomFields: hasCustomFieldsFn, getPayrollConfig: getPayrollConfigFn } = await import('../lib/payroll-client-specific')
        const [hasCustomResult, configResult] = await Promise.all([
          hasCustomFieldsFn(companyId, supabase),
          getPayrollConfigFn(companyId, supabase)
        ])
        setHasCustom(hasCustomResult)
        setPayrollConfig(configResult || null)
      } catch (error) {
        console.error('Error loading payroll config:', error)
        setHasCustom(false)
        setPayrollConfig(null)
      }
    }
    loadConfig()
    
    // Listen for config updates from PayrollConfigEditor
    const handleConfigUpdate = (event: CustomEvent) => {
      if (event.detail?.companyId === companyId) {
        console.log('🔄 Payroll config updated, reloading...')
        loadConfig()
      }
    }
    
    window.addEventListener('payrollConfigUpdated', handleConfigUpdate as EventListener)
    
    return () => {
      window.removeEventListener('payrollConfigUpdated', handleConfigUpdate as EventListener)
    }
  }, [companyId])

  const statutoryDeductionColumns = useMemo(
    () =>
      resolveStatutoryDeductionColumns(
        payrollApiConfig?.legal_deductions ?? null,
        (payrollApiConfig?.custom_fields as Record<string, CustomFieldConfigEntry> | undefined) ??
          null
      ),
    [payrollApiConfig]
  )

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>()
    rows.forEach(row => {
      if (row.department) {
        depts.add(row.department)
      }
    })
    return Array.from(depts).sort()
  }, [rows])

  // Separate rows by pay_type
  const { fixedRows, hourlyRows } = useMemo(() => {
    const fixed: typeof rows = []
    const hourly: typeof rows = []
    
    rows.forEach(row => {
      const payType = (row as any).pay_type || 'fixed'
      if (payType === 'hourly' || payType === 'admin_floor') {
        hourly.push(row)
      } else {
        fixed.push(row)
      }
    })
    
    return { fixedRows: fixed, hourlyRows: hourly }
  }, [rows])

  // Filter and sort employees (separate for fixed and hourly)
  const filteredAndSortedFixedRows = useMemo(() => {
    let filtered = [...fixedRows]

    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(row => row.department === departmentFilter)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareA: string
      let compareB: string

      if (sortBy === 'department') {
        compareA = a.department?.toLowerCase() || ''
        compareB = b.department?.toLowerCase() || ''
      } else {
        compareA = a.name?.toLowerCase() || ''
        compareB = b.name?.toLowerCase() || ''
      }

      if (sortOrder === 'asc') {
        return compareA.localeCompare(compareB)
      } else {
        return compareB.localeCompare(compareA)
      }
    })

    return sorted
  }, [fixedRows, departmentFilter, sortBy, sortOrder])

  const filteredAndSortedHourlyRows = useMemo(() => {
    let filtered = [...hourlyRows]

    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(row => row.department === departmentFilter)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareA: string
      let compareB: string

      if (sortBy === 'department') {
        compareA = a.department?.toLowerCase() || ''
        compareB = b.department?.toLowerCase() || ''
      } else {
        compareA = a.name?.toLowerCase() || ''
        compareB = b.name?.toLowerCase() || ''
      }

      if (sortOrder === 'asc') {
        return compareA.localeCompare(compareB)
      } else {
        return compareB.localeCompare(compareA)
      }
    })

    return sorted
  }, [hourlyRows, departmentFilter, sortBy, sortOrder])

  // Calculate summaries separately (used in PayrollFixedTable and PayrollHourlyTable components)
  // eslint-disable-next-line no-unused-vars
  const _fixedSummary = useMemo(() => {
    return filteredAndSortedFixedRows.reduce((acc, r) => {
      acc.totalBruto += r.total_earnings || 0
      acc.totalDeducciones += r.total_deducciones || 0
      acc.totalNeto += r.total || 0
      return acc
    }, { totalBruto: 0, totalDeducciones: 0, totalNeto: 0 })
  }, [filteredAndSortedFixedRows])

  // eslint-disable-next-line no-unused-vars
  const _hourlySummary = useMemo(() => {
    return filteredAndSortedHourlyRows.reduce((acc, r) => {
      acc.totalBruto += r.total_earnings || 0
      acc.totalDeducciones += r.total_deducciones || 0
      acc.totalNeto += r.total || 0
      acc.totalHoras += (r as any).total_hours_worked || 0
      return acc
    }, { totalBruto: 0, totalDeducciones: 0, totalNeto: 0, totalHoras: 0 })
  }, [filteredAndSortedHourlyRows])

  // Paginate results separately with independent pagination
  const paginatedFixedRows = useMemo(() => {
    const startIndex = (currentPageFixed - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedFixedRows.slice(startIndex, endIndex)
  }, [filteredAndSortedFixedRows, currentPageFixed, itemsPerPage])

  const paginatedHourlyRows = useMemo(() => {
    const startIndex = (currentPageHourly - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedHourlyRows.slice(startIndex, endIndex)
  }, [filteredAndSortedHourlyRows, currentPageHourly, itemsPerPage])

  // Calculate total pages independently
  const totalPagesFixed = Math.ceil(filteredAndSortedFixedRows.length / itemsPerPage)
  const totalPagesHourly = Math.ceil(filteredAndSortedHourlyRows.length / itemsPerPage)

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const toggleSortBy = () => {
    setSortBy(prev => prev === 'name' ? 'department' : 'name')
  }

  // eslint-disable-next-line no-unused-vars
  const _toggleRow = (_employeeId: string) => {
    // Function kept for potential future use with expandable rows
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(_employeeId)) {
      newExpanded.delete(_employeeId)
    } else {
      newExpanded.add(_employeeId)
    }
    setExpandedRows(newExpanded)
  }


  // Función para determinar el estado del botón de autorización
  const getAuthorizationButtonState = (): {
    text: string;
    icon: IconName;
    className: string;
    disabled: boolean;
    showAnimation: boolean;
    showSuccessEffect: boolean;
  } => {
    const isAuthorized = status === 'authorized' || status === 'distributed'
    const isAuthorizing = loading && status === 'authorizing'
    const canAuth = (status === 'draft' || status === 'edited') && !!runId && !loading
    
    if (isAuthorized) {
      return {
        text: 'Nómina Autorizada',
        icon: 'check',
        className: 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-default shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/20',
        disabled: true,
        showAnimation: false,
        showSuccessEffect: true
      }
    }
    
    if (isAuthorizing) {
      return {
        text: 'Autorizando...',
        icon: 'refresh',
        className: 'bg-green-600 hover:bg-green-700 text-white',
        disabled: true,
        showAnimation: true,
        showSuccessEffect: false
      }
    }
    
    return {
      text: 'Autorizar Nómina',
      icon: 'check',
      className: 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/25',
      disabled: !canAuth,
      showAnimation: false,
      showSuccessEffect: false
    }
  }

  const buttonState = getAuthorizationButtonState()

  const monthName = new Date(period.year, period.month - 1).toLocaleDateString('es-HN', { month: 'long' })

  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-xl font-semibold">
          Nómina — Detalle por Empleado
        </CardTitle>
        <CardDescription className="text-gray-200 text-base">
          {fixedRows.length} empleados fijos • {hourlyRows.length} empleados por hora • 
          Total Bruto: {formatCurrency(resumen.total_bruto)} • 
          Total Neto: {formatCurrency(resumen.total_neto)} • 
          Período: {monthName} {period.year} Q{period.quincena}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Alerta de marcas incompletas (check-in sin check-out) */}
        {incompleteRecordsAlert.length > 0 && (
          <div className="mb-4 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Icon name="alert" className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-200">Marcas huérfanas (sin check-out)</h4>
                <p className="text-sm text-amber-100/90 mt-1">
                  Los siguientes empleados tienen registros con entrada pero sin salida. Las horas de esos registros no se incluyeron en el cálculo (o se usó el valor por defecto configurado).
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
                  {incompleteRecordsAlert.map((a) => (
                    <li key={a.employee_id}>
                      <strong>{a.employee_name}</strong>: {a.dates.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-500/30 rounded-lg border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-200">{resumen.empleados}</div>
            <div className="text-sm font-semibold text-blue-200">Empleados</div>
          </div>
          
          <div className="text-center p-4 bg-green-500/30 rounded-lg border border-green-500/20">
            <div className="text-2xl font-bold text-green-200">{formatCurrency(resumen.total_bruto)}</div>
            <div className="text-sm font-semibold text-green-200">Total Bruto</div>
          </div>
          
          <div className="text-center p-4 bg-red-500/30 rounded-lg border border-red-500/20">
            <div className="text-2xl font-bold text-red-200">
              {formatCurrency(Object.values(resumen.total_deducciones).reduce((a, b) => a + b, 0))}
            </div>
            <div className="text-sm font-semibold text-red-200">Total Deducciones</div>
          </div>
          
          <div className="text-center p-4 bg-purple-500/30 rounded-lg border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-200">{formatCurrency(resumen.total_neto)}</div>
            <div className="text-sm font-semibold text-purple-200">Total Neto</div>
          </div>
        </div>

        {/* Filters and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-white">Departamento:</label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value)
                setCurrentPageFixed(1)
                setCurrentPageHourly(1)
              }}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all" className="bg-gray-800">Todos</option>
              {departments.map(dept => (
                <option key={dept} value={dept} className="bg-gray-800">{dept}</option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-white">Ordenar por:</label>
            <button
              onClick={toggleSortBy}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
            >
              {sortBy === 'name' ? 'Nombre' : 'Departamento'}
            </button>
            <button
              onClick={toggleSortOrder}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-colors flex items-center gap-1"
            >
              {sortOrder === 'asc' ? (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  A-Z
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Z-A
                </>
              )}
            </button>
          </div>

          {/* Results count */}
          <div className="flex items-center text-sm text-gray-300 sm:ml-auto">
            {fixedRows.length} fijos • {hourlyRows.length} por hora
          </div>
        </div>

        {/* Sección 1: Nómina — Empleados Fijos (fixed) */}
        {fixedRows.length > 0 && (
          <>
          <PayrollFixedTable
            rows={paginatedFixedRows}
            onPreviewVoucher={onPreviewVoucher}
            onGenerateVoucher={onGenerateVoucher}
            onEditCustomFields={onEditCustomFields}
            canAdjustFixedDays={canAdjustFixedDays}
            payrollRunStatus={status}
            onAdjustFixedDays={onAdjustFixedDays}
            onResetLineRecalc={onResetLineRecalc}
            canResetLineRecalc={canResetLineRecalc}
            loading={loading}
            hasCustom={hasCustom}
            statutoryDeductions={statutoryDeductionColumns}
          />
            {/* Paginación independiente para empleados fijos */}
            {totalPagesFixed > 1 && (
              <div className="mb-6">
                <Pagination
                  currentPage={currentPageFixed}
                  totalPages={totalPagesFixed}
                  totalItems={filteredAndSortedFixedRows.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPageFixed}
                />
              </div>
            )}
          </>
        )}

        {/* Sección 2: Nómina — Detalle por Empleado (hourly) */}
        {hourlyRows.length > 0 && (
          <>
          <PayrollHourlyTable
            rows={paginatedHourlyRows}
            onPreviewVoucher={onPreviewVoucher}
            onGenerateVoucher={onGenerateVoucher}
            onEditCustomFields={onEditCustomFields}
            onResetLineRecalc={onResetLineRecalc}
            canResetLineRecalc={canResetLineRecalc}
            loading={loading}
            hasCustom={hasCustom}
            statutoryDeductions={statutoryDeductionColumns}
          />
            {/* Paginación independiente para empleados por hora */}
            {totalPagesHourly > 1 && (
              <div className="mb-6">
                <Pagination
                  currentPage={currentPageHourly}
                  totalPages={totalPagesHourly}
                  totalItems={filteredAndSortedHourlyRows.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPageHourly}
                />
              </div>
            )}
          </>
        )}

        {/* Mensaje si no hay empleados */}
        {fixedRows.length === 0 && hourlyRows.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No hay empleados para este período
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/20">
          {/* Pre-Authorize Button - Only show in draft status */}
          {onPreAuthorize && status === 'draft' && (
            <Button
              onClick={onPreAuthorize}
              disabled={!runId || loading}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white transform hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25"
            >
              <Icon name="check" className="h-4 w-4" />
              Consolidar Cambios
            </Button>
          )}

          {/* Authorize Button - Enabled when status is 'edited' or 'draft' */}
          <Button
            onClick={onAuthorize}
            disabled={buttonState.disabled}
            className={`flex items-center gap-2 ${buttonState.className} relative overflow-hidden`}
          >
            {buttonState.showAnimation ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Icon name={buttonState.icon} className={`h-4 w-4 ${buttonState.showSuccessEffect ? 'animate-pulse' : ''}`} />
            )}
            {buttonState.text}
            {buttonState.showSuccessEffect && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 animate-pulse"></div>
            )}
          </Button>

          {/* Vista previa planilla — disponible con corrida activa (borrador o autorizada) */}
          <Button
            onClick={onOpenPlanillaPreview}
            disabled={!runId || loading || !onOpenPlanillaPreview}
            variant="outline"
            className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
            title="Revisar planilla en pantalla y descargar PDF"
          >
            <Icon name="document" className="h-4 w-4" />
            Vista previa planilla
          </Button>

          {/* Send Email - Only enabled after PDF generation (tracked separately) */}
          <Button
            onClick={onSendEmail}
            disabled={!runId || loading || !canSend}
            variant="outline"
            className={`flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50 ${isBulkEmailBlocked && canSend ? 'border-amber-400/40' : ''}`}
            title={
              !canSend
                ? 'Autorice y genere PDF primero'
                : isBulkEmailBlocked
                  ? bulkEmailBlockedMessage || 'Función disponible en plan de pago'
                  : 'Enviar recibos por email'
            }
          >
            <Icon name="envelope" className="h-4 w-4" />
            {isBulkEmailBlocked && canSend ? 'Enviar por Email (plan de pago)' : 'Enviar por Email'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
