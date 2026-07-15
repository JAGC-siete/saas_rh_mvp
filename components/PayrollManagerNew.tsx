import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Icon } from './Icon'
import { usePayrollManager } from '../lib/hooks/usePayrollManager'
import UnifiedPayrollTable from './UnifiedPayrollTable'
import ConfigNomina from './ConfigNomina'
import CustomPayrollFieldsForm from './CustomPayrollFieldsForm'
import DeductionPlansDashboard from './DeductionPlansDashboard'
import { PayrollAccountingTab } from './accounting/PayrollAccountingTab'
import VoucherPreviewModal from './payroll/VoucherPreviewModal'
import PlanillaPreviewModal from './payroll/PlanillaPreviewModal'
import { getBrowserAuthHeaders } from '../lib/auth/browser-auth-headers'

interface ModalState {
  lineId: string
  employeeId?: string
  metadata: Record<string, unknown> | null
  baseSalary: number
}

export default function PayrollManagerNew({ companyId: propCompanyId }: { companyId?: string }) {
  // Use the new unified payroll manager
  const payroll = usePayrollManager()
  
  // Modal state for editing custom fields - combined into single state object
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false)
  const [modalState, setModalState] = useState<ModalState | null>(null)
  
  const [payrollApiConfig, setPayrollApiConfig] = useState<{
    legal_deductions?: { ihss?: boolean; rap?: boolean; isr?: boolean }
    custom_fields?: Record<string, unknown>
    pay_overtime?: boolean
  } | null>(null)

  // Tab: Planilla | Partida Contable
  const [activeTab, setActiveTab] = useState<'planilla' | 'contabilidad'>('planilla')
  
  // Debug logging para verificar el companyId (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 PayrollManagerNew - companyId from context:', payroll.companyId, 'loading:', payroll.companyLoading)
    }
  }, [payroll.companyId, payroll.companyLoading])

  // Fetch company payroll config for legal deductions / custom fields
  useEffect(() => {
    if (!payroll.companyId) return
    fetch('/api/payroll/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const cfg = data?.config
        setPayrollApiConfig(
          cfg
            ? {
                legal_deductions: cfg.legal_deductions,
                custom_fields: cfg.custom_fields,
                pay_overtime: cfg.pay_overtime !== false,
              }
            : null
        )
      })
      .catch(() => {
        setPayrollApiConfig(null)
      })
  }, [payroll.companyId])

  // Memoize total deducciones calculation to avoid recalculating on every render
  const totalDeducciones = useMemo(() => {
    if (!payroll.unifiedData?.resumen.total_deducciones) return 0
    return Object.values(payroll.unifiedData.resumen.total_deducciones).reduce((a, b) => a + b, 0)
  }, [payroll.unifiedData?.resumen.total_deducciones])

  // Handle filter changes - now unified (memoized to prevent re-renders)
  const handleFilterChange = useCallback(async (key: string, value: unknown) => {
    await payroll.updateFilter(key as keyof typeof payroll.filters, value)
  }, [payroll])

  const handleGenerateJournalEntries = useCallback(async () => {
    if (!payroll.runId || !payroll.companyId) return
    const res = await fetch('/api/accounting/generate-journal-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: payroll.runId }),
      credentials: 'include'
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        (data as { error?: string; message?: string }).error ||
        (data as { message?: string }).message ||
        'Error generando asientos'
      throw new Error(msg)
    }
  }, [payroll.runId, payroll.companyId])

  // Handle unified preview - now single handler (memoized)
  const handlePreview = useCallback(async () => {
    try {
      await payroll.generatePreview()
      await payroll.loadAhcPreflight()
    } catch (error: unknown) {
      // Error handling is done in the hook
      console.error('Error in handlePreview:', error)
    }
  }, [payroll])

  const handleRecalculateMissingAhc = useCallback(async () => {
    try {
      const r = await payroll.recalculateMissingAhc()
      alert(`Recalculo completado.\n\nPendientes: ${r.missing}\nCalculados: ${r.calculated}`)
      await payroll.loadUnifiedData()
      await payroll.loadAhcPreflight()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      alert(`Error recalculando horas pendientes: ${msg}`)
    }
  }, [payroll])

  // Marca la corrida como revisada (los campos personalizados ya se guardan al cerrar el modal)
  const handlePreAuthorize = useCallback(async () => {
    if (!payroll.runId) {
      alert('No hay corrida de nómina activa')
      return
    }

    try {
      const response = await fetch('/api/payroll/pre-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ run_id: payroll.runId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al consolidar nómina')
      }

      const data = await response.json()
      await payroll.loadUnifiedData()

      alert(
        `Nómina consolidada exitosamente\n\n` +
          `Líneas editadas: ${data.summary.edited_lines}\n` +
          `Con campos personalizados: ${data.summary.lines_with_metadata}\n` +
          `Total Neto: L. ${data.summary.total_neto.toFixed(2)}\n\n` +
          `Ya puede autorizar la nómina`
      )
    } catch (error: unknown) {
      console.error('Error consolidando:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert('Error al consolidar: ' + errorMessage)
    }
  }, [payroll])

  // Handle edit custom fields (memoized)
  const handleEditCustomFields = useCallback((lineId: string, metadata: Record<string, unknown> | null, baseSalary: number, employeeId?: string) => {
    setModalState({
      lineId,
      employeeId,
      metadata,
      baseSalary: baseSalary || 0
    })
    setShowCustomFieldsModal(true)
  }, [])

  const handleAdjustFixedDays = useCallback(
    async (payload: { run_line_id: string; days_worked: number; reason?: string }) => {
      const authHeaders = await getBrowserAuthHeaders()
      const res = await fetch('/api/payroll/adjust-fixed-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al ajustar días')
      }
      await payroll.loadUnifiedData()
    },
    [payroll]
  )

  const handleAdjustFixedOvertime = useCallback(
    async (payload: {
      run_line_id: string
      overtime: {
        evening_25: number
        night_50: number
        late_75: number
        morning_25: number
        holiday_100: number
      }
      reason?: string
    }) => {
      const authHeaders = await getBrowserAuthHeaders()
      const res = await fetch('/api/payroll/adjust-fixed-overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al ajustar horas extras')
      }
      await payroll.loadUnifiedData()
    },
    [payroll]
  )

  const normalizeCustomFields = (metadata: Record<string, unknown>): Record<string, unknown> => {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(metadata)) {
      if (value === '' || value === null || value === undefined) continue
      if (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '') {
        normalized[key] = parseFloat(value)
      } else if (typeof value === 'string' && (value === 'true' || value === 'false')) {
        normalized[key] = value === 'true'
      } else {
        normalized[key] = value
      }
    }
    return normalized
  }

  const handleResetLineRecalc = useCallback(
    async (runLineId: string) => {
      const authHeaders = await getBrowserAuthHeaders()
      const res = await fetch('/api/payroll/reset-line-recalc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ run_line_id: runLineId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al preparar recálculo')
      }
      await payroll.generatePreview()
    },
    [payroll]
  )

  const handleZeroStatutory = useCallback(
    async (payload: { run_line_id: string; reason: string }) => {
      const res = await fetch('/api/payroll/zero-statutory-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al omitir retenciones de ley')
      }
      await payroll.loadUnifiedData()
    },
    [payroll]
  )

  // Persist custom fields immediately when saving the modal
  const handleSaveCustomFields = useCallback(async (metadata: Record<string, unknown>) => {
    if (!modalState) {
      throw new Error('No hay estado de modal activo')
    }

    if (!payroll.unifiedData) {
      throw new Error('No hay datos de planilla cargados')
    }

    const row = payroll.unifiedData.rows.find(
      (r) => r.line_id === modalState.lineId || r.employee_id === modalState.lineId
    )

    if (!row?.line_id) {
      throw new Error('Línea de planilla no encontrada. Genere preview primero.')
    }

    const custom_fields = normalizeCustomFields(metadata)

    const res = await fetch('/api/payroll/update-custom-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        run_line_id: row.line_id,
        custom_fields,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const details = Array.isArray(data.details)
        ? data.details.map((d: unknown) => String(d)).join('\n')
        : ''
      throw new Error(data.error || data.message || details || 'Error guardando campos personalizados')
    }

    await payroll.loadUnifiedData()
    setShowCustomFieldsModal(false)
    setModalState(null)
  }, [modalState, payroll])

  // Loading state while company is being loaded
  if (payroll.companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="backdrop-blur-md bg-blue-500/20 border border-blue-500/30">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-blue-300 mb-2">Cargando...</h2>
            <p className="text-blue-200">Obteniendo información de la empresa...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Early return if no company_id
  if (!payroll.companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="backdrop-blur-md bg-red-500/20 border border-red-500/30">
          <CardContent className="p-6 text-center">
            <Icon name="alert" className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-300 mb-2">Sin Empresa Asignada</h2>
            <p className="text-red-200">No se encontró una empresa asociada a tu cuenta. Contacta al administrador.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      idle: 'bg-white/20 text-gray-300',
      previewing: 'bg-blue-500/20 text-blue-300',
      draft: 'bg-blue-500/20 text-blue-300',
      edited: 'bg-yellow-500/20 text-yellow-300',
      authorizing: 'bg-orange-500/20 text-orange-300',
      authorized: 'bg-green-500/20 text-green-300',
      distributed: 'bg-purple-500/20 text-purple-300',
      error: 'bg-red-500/20 text-red-300'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
        variants[status as keyof typeof variants] || variants.idle
      }`}>
        {status === 'idle' ? 'Inactivo' :
         status === 'previewing' ? 'Generando Preview' :
         status === 'draft' ? 'Borrador' :
         status === 'edited' ? 'Editado' :
         status === 'authorizing' ? 'Autorizando' :
         status === 'authorized' ? 'Autorizado' :
         status === 'distributed' ? 'Distribuido' :
         status === 'error' ? 'Error' : status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Nómina</h1>
          <p className="text-gray-300">Sistema de nómina unificado con auditoría y versionado</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Indicador de borrador guardado */}
          {(payroll.status === 'draft' || payroll.status === 'edited') && payroll.runId && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
              <Icon name="check" className="h-4 w-4 text-blue-300" />
              <span className="text-sm font-medium text-blue-300">Borrador Guardado</span>
            </div>
          )}
          
          {getStatusBadge(payroll.status)}
          
          {payroll.loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {payroll.error && (
        <Card variant="liquid" className="border-red-500/30 bg-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-300">
              <Icon name="alert" className="h-5 w-5" />
              <span className="font-medium">Error:</span>
              <span>{payroll.error}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={payroll.clearError}
              >
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DASHBOARD DE MÉTRICAS - GRID RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* 1. Empleados Activos */}
        <Card variant="liquid" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Empleados Activos</p>
                <p className="text-2xl font-bold text-white">
                  {payroll.loading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                  ) : (
                    payroll.unifiedData?.resumen.empleados || payroll.metrics.activeEmployees || 0
                  )}
                </p>
              </div>
              <div className="p-2 bg-blue-500/30 rounded-full">
                <Icon name="users" className="h-6 w-6 text-blue-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Salario Quincenal */}
        <Card variant="liquid" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total Salario Quincenal</p>
                <p className="text-2xl font-bold text-white">
                  {payroll.loading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                  ) : (
                    payroll.unifiedData?.resumen.total_bruto ? `L. ${payroll.unifiedData.resumen.total_bruto.toLocaleString('es-HN')}` : 'L. 0'
                  )}
                </p>
              </div>
              <div className="p-2 bg-green-500/30 rounded-full">
                <Icon name="money" className="h-6 w-6 text-green-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Total Deducciones */}
        <Card variant="liquid" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total Deducciones</p>
                <p className="text-2xl font-bold text-white">
                  {payroll.loading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                  ) : (
                    `L. ${totalDeducciones.toLocaleString('es-HN')}`
                  )}
                </p>
              </div>
              <div className="p-2 bg-red-500/30 rounded-full">
                <Icon name="chart" className="h-6 w-6 text-red-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Salario Neto */}
        <Card variant="liquid" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total Salario Neto</p>
                <p className="text-2xl font-bold text-white">
                  {payroll.loading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                  ) : (
                    payroll.unifiedData?.resumen.total_neto ? `L. ${payroll.unifiedData.resumen.total_neto.toLocaleString('es-HN')}` : 'L. 0'
                  )}
                </p>
              </div>
              <div className="p-2 bg-emerald-500/30 rounded-full">
                <Icon name="money" className="h-6 w-6 text-emerald-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planes de deducción activos */}
      {payroll.companyId && (
        <DeductionPlansDashboard companyId={payroll.companyId} />
      )}

      {/* Configuración de Nómina */}
      <ConfigNomina
        year={payroll.currentPeriod.year}
        month={payroll.currentPeriod.month}
        quincena={payroll.currentPeriod.quincena}
        deductionModeLabel={payroll.deductionModeLabel}
        onYearChange={(year) => handleFilterChange('year', year)}
        onMonthChange={(month) => handleFilterChange('month', month)}
        onQuincenaChange={(quincena) => handleFilterChange('quincena', quincena)}
        onPreview={handlePreview}
        onReset={payroll.resetFilters}
        loading={payroll.loading}
        canPreview={payroll.canPreview}
      />

      {/* Preflight AHC (overtime readiness) */}
      {payroll.unifiedData && (payroll.ahcPreflight || payroll.ahcPreflightError) && (
        <Card
          variant="liquid"
          className={`border ${
            payroll.ahcPreflightError
              ? 'border-red-500/35 bg-red-500/10'
              : payroll.ahcPreflight?.status === 'GREEN'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-amber-500/35 bg-amber-500/10'
          }`}
        >
          <CardContent className="pt-5 pb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    payroll.ahcPreflightError
                      ? 'bg-red-500/20 text-red-200'
                      : payroll.ahcPreflight?.status === 'GREEN'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-amber-500/20 text-amber-200'
                  }`}
                >
                  {payroll.ahcPreflightError
                    ? 'Error al verificar'
                    : payroll.ahcPreflight?.status === 'GREEN'
                      ? 'Horas calculadas'
                      : 'Faltan horas por calcular'}
                </span>
                <span className="text-sm text-gray-200 font-medium">
                  Horas desde asistencia (incluye extras para nómina)
                </span>
              </div>
              {payroll.ahcPreflightError ? (
                <p className="text-xs text-red-200">{payroll.ahcPreflightError}</p>
              ) : payroll.ahcPreflight ? (
                <>
                  <p className="text-xs text-gray-300">
                    Marcas completas (entrada/salida):{' '}
                    <span className="font-semibold">{payroll.ahcPreflight.completeRecords}</span> · Ya calculadas:{' '}
                    <span className="font-semibold">{payroll.ahcPreflight.ahcRecords}</span> · Por calcular:{' '}
                    <span className="font-semibold">{payroll.ahcPreflight.missingAHC}</span>
                  </p>
                  {payroll.ahcPreflight.recommendedAction && (
                    <p className="text-xs text-gray-400">{payroll.ahcPreflight.recommendedAction}</p>
                  )}
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-white"
                disabled={payroll.ahcPreflightLoading || payroll.loading}
                onClick={() => payroll.loadAhcPreflight()}
              >
                {payroll.ahcPreflightLoading ? 'Verificando…' : 'Actualizar estado'}
              </Button>
              {payroll.ahcPreflight && payroll.ahcPreflight.missingAHC > 0 && (
                <Button
                  type="button"
                  className="bg-brand-600 hover:bg-brand-700 text-white"
                  disabled={payroll.loading}
                  onClick={() => void handleRecalculateMissingAhc()}
                >
                  Recalcular pendientes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Planilla | Partida Contable */}
      {payroll.unifiedData && payroll.runId && (
        <div className="flex gap-2 border-b border-white/20 pb-2">
          <Button
            variant={activeTab === 'planilla' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('planilla')}
            className={
              activeTab === 'planilla'
                ? 'bg-brand-600 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }
          >
            Planilla
          </Button>
          <Button
            variant={activeTab === 'contabilidad' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('contabilidad')}
            className={
              activeTab === 'contabilidad'
                ? 'bg-brand-600 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }
          >
            Partida Contable
          </Button>
        </div>
      )}

      {/* Tab content: Planilla */}
      {activeTab === 'planilla' && (
      <>
      {/* Unified Payroll Table */}
      {payroll.unifiedData && (
        <UnifiedPayrollTable
          rows={payroll.unifiedData.rows}
          resumen={payroll.unifiedData.resumen}
          incompleteRecordsAlert={payroll.unifiedData.incompleteRecordsAlert}
          onPreviewVoucher={payroll.openVoucherPreview}
          onGenerateVoucher={payroll.generateVoucher}
          onPreAuthorize={handlePreAuthorize}
          onAuthorize={payroll.authorizeRun}
          onOpenPlanillaPreview={() => void payroll.openPlanillaPreview()}
          onSendEmail={() => payroll.sendEmail()}
          onEditCustomFields={handleEditCustomFields}
          canAdjustFixedDays={
            !!payroll.runId && (payroll.status === 'draft' || payroll.status === 'edited')
          }
          onAdjustFixedDays={handleAdjustFixedDays}
          onAdjustFixedOvertime={handleAdjustFixedOvertime}
          companyPayOvertime={payrollApiConfig?.pay_overtime !== false}
          onResetLineRecalc={handleResetLineRecalc}
          canResetLineRecalc={payroll.status === 'draft' || payroll.status === 'edited'}
          canZeroStatutory={
            !!payroll.runId && (payroll.status === 'draft' || payroll.status === 'edited')
          }
          onZeroStatutory={handleZeroStatutory}
          loading={payroll.loading}
          canAuthorize={payroll.canAuthorize}
          canSend={payroll.canSend}
          isBulkEmailBlocked={payroll.isBulkEmailBlocked}
          bulkEmailBlockedMessage={payroll.bulkEmailBlockedMessage}
          runId={payroll.runId}
          status={payroll.status}
          period={payroll.currentPeriod}
          companyId={payroll.companyId}
          payrollApiConfig={payrollApiConfig}
        />
      )}
      </>
      )}

      {/* Tab content: Partida Contable */}
      {activeTab === 'contabilidad' && (
        <PayrollAccountingTab
          runId={payroll.runId}
          status={payroll.status}
          companyId={payroll.companyId}
          onGenerate={handleGenerateJournalEntries}
        />
      )}

      {/* Loading State */}
      {!payroll.unifiedData && payroll.loading && (
        <Card variant="liquid" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-blue-300 mb-2">Cargando Datos</h2>
            <p className="text-blue-200">Obteniendo información de nómina...</p>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!payroll.unifiedData && !payroll.loading && (
        <Card variant="liquid" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-6 text-center">
            <Icon name="alert" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">Sin Datos</h2>
            <p className="text-gray-400">No hay datos de nómina para el período seleccionado</p>
            <Button 
              onClick={handlePreview}
              className="mt-4"
              disabled={!payroll.canPreview}
            >
              Generar Preview
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Custom Fields Modal */}
      {showCustomFieldsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <CustomPayrollFieldsForm
                companyId={payroll.companyId || ''}
                runLineId={modalState?.lineId || ''}
                employeeId={modalState?.employeeId}
                currentMetadata={modalState?.metadata || null}
                baseSalary={modalState?.baseSalary || 0}
                onSave={handleSaveCustomFields}
                onCancel={() => {
                  setShowCustomFieldsModal(false)
                  setModalState(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      <VoucherPreviewModal
        open={payroll.voucherPreview.open}
        loading={payroll.voucherPreview.loading}
        error={payroll.voucherPreview.error}
        data={payroll.voucherPreview.data}
        downloading={payroll.voucherPreview.downloading}
        onClose={payroll.closeVoucherPreview}
        onDownload={payroll.downloadVoucherFromPreview}
      />

      <PlanillaPreviewModal
        open={payroll.planillaPreview.open}
        loading={payroll.planillaPreview.loading}
        error={payroll.planillaPreview.error}
        data={payroll.planillaPreview.data}
        downloading={payroll.planillaPreview.downloading}
        onClose={payroll.closePlanillaPreview}
        onDownload={payroll.downloadPlanillaFromPreview}
      />
    </div>
  )
}
