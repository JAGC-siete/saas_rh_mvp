import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Icon } from './Icon'
import { usePayrollManager } from '../lib/hooks/usePayrollManager'
import UnifiedPayrollTable from './UnifiedPayrollTable'
import ConfigNomina from './ConfigNomina'
import CustomPayrollFieldsForm from './CustomPayrollFieldsForm'
import { calculatePayroll } from '../lib/payroll-client-specific'
import { createClient } from '../lib/supabase/client'

// Type definitions for better type safety
interface CustomFieldData {
  metadata: Record<string, unknown>
  eff_bruto: number
  eff_neto: number
}

interface ModalState {
  lineId: string
  metadata: Record<string, unknown> | null
  baseSalary: number
}

export default function PayrollManagerNew({ companyId: propCompanyId }: { companyId?: string }) {
  // Use the new unified payroll manager
  const payroll = usePayrollManager()
  
  // Modal state for editing custom fields - combined into single state object
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false)
  const [modalState, setModalState] = useState<ModalState | null>(null)
  
  // Local state for preview-only custom fields changes (not persisted until authorization)
  const [previewCustomFields, setPreviewCustomFields] = useState<Record<string, CustomFieldData>>({})
  
  // Debug logging para verificar el companyId (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 PayrollManagerNew - companyId from context:', payroll.companyId, 'loading:', payroll.companyLoading)
    }
  }, [payroll.companyId, payroll.companyLoading])

  // Memoize total deducciones calculation to avoid recalculating on every render
  const totalDeducciones = useMemo(() => {
    if (!payroll.unifiedData?.resumen.total_deducciones) return 0
    return Object.values(payroll.unifiedData.resumen.total_deducciones).reduce((a, b) => a + b, 0)
  }, [payroll.unifiedData?.resumen.total_deducciones])

  // Handle filter changes - now unified (memoized to prevent re-renders)
  const handleFilterChange = useCallback(async (key: string, value: unknown) => {
    await payroll.updateFilter(key as keyof typeof payroll.filters, value)
  }, [payroll])

  // Handle unified preview - now single handler (memoized)
  const handlePreview = useCallback(async () => {
    try {
      await payroll.generatePreview()
    } catch (error: unknown) {
      // Error handling is done in the hook
      console.error('Error in handlePreview:', error)
    }
  }, [payroll])

  // Handle pre-authorize - NOW PERSISTS custom fields to database using batch API (memoized)
  const handlePreAuthorize = useCallback(async () => {
    if (!payroll.runId) {
      alert('No hay corrida de nómina activa')
      return
    }

    try {
      // First, persist all preview custom fields to database using batch endpoint
      if (Object.keys(previewCustomFields).length > 0) {
        const { companyId } = payroll
        if (!companyId) {
          throw new Error('Company ID no encontrado')
        }

        // Prepare batch updates
        const batchUpdates = Object.entries(previewCustomFields).map(([lineId, fieldData]) => ({
          run_line_id: lineId,
          custom_fields: fieldData.metadata
        }))

        // Save all custom field changes in a single batch API call
        const batchResponse = await fetch('/api/payroll/update-custom-fields-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: batchUpdates })
        })

        if (!batchResponse.ok) {
          const error = await batchResponse.json()
          throw new Error(`Error guardando campos en batch: ${error.error || error.message || 'Error desconocido'}`)
        }

        const batchData = await batchResponse.json()
        
        // Check if all updates were successful
        if (!batchData.success) {
          // Partial failure - show which ones failed
          interface BatchResult {
            run_line_id: string
            success: boolean
            error?: string
          }
          const failedUpdates = (batchData.results as BatchResult[] | undefined)?.filter((r) => !r.success) || []
          if (failedUpdates.length > 0) {
            const failedLines = failedUpdates.map((r) => r.run_line_id).join(', ')
            throw new Error(`Error guardando algunos campos. Líneas con error: ${failedLines}`)
          }
        }

        console.log(`✅ Batch update successful: ${batchData.summary?.successful || 0} líneas actualizadas`)

        // Clear preview fields after persisting
        setPreviewCustomFields({})
      }

      // Then update status to 'edited'
      const response = await fetch('/api/payroll/pre-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: payroll.runId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al consolidar nómina')
      }

      const data = await response.json()
      
      // Reload data to reflect persisted changes and new status
      await payroll.loadUnifiedData()
      
      alert(`Nómina consolidada exitosamente\n\n` +
            `✓ Cambios guardados en base de datos\n` +
            `Líneas editadas: ${data.summary.edited_lines}\n` +
            `Con campos personalizados: ${data.summary.lines_with_metadata}\n` +
            `Total Neto: L. ${data.summary.total_neto.toFixed(2)}\n\n` +
            `Ya puede autorizar la nómina`)
    } catch (error: unknown) {
      console.error('Error consolidando:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert('Error al consolidar: ' + errorMessage)
    }
  }, [payroll, previewCustomFields])

  // Handle edit custom fields (memoized)
  const handleEditCustomFields = useCallback((lineId: string, metadata: Record<string, unknown> | null, baseSalary: number) => {
    setModalState({
      lineId,
      metadata,
      baseSalary: baseSalary || 0
    })
    setShowCustomFieldsModal(true)
  }, [])

  // Handle save custom fields - ONLY UPDATE PREVIEW (not persisted until authorization) (memoized)
  const handleSaveCustomFields = useCallback(async (metadata: Record<string, unknown>) => {
    if (!modalState) {
      throw new Error('No hay estado de modal activo')
    }

    try {
      const companyId = payroll.companyId
      if (!companyId) {
        throw new Error('Company ID no encontrado')
      }

      // Find the row in current data
      if (!payroll.unifiedData) {
        throw new Error('No hay datos de planilla cargados')
      }

      const row = payroll.unifiedData.rows.find(
        r => (r.line_id === modalState.lineId || r.employee_id === modalState.lineId)
      )

      if (!row) {
        throw new Error('Línea de planilla no encontrada')
      }

      // Calculate new totals using new calculation engine
      const supabase = createClient()
      const calcResult = await calculatePayroll(
        companyId,
        row.total_earnings || 0,
        metadata,
        supabase
      )
      
      const ingresosAdicionales = calcResult.totalIngresosAdicionales
      const deduccionesAdicionales = calcResult.totalDeduccionesAdicionales

      // Calculate new net
      const baseBruto = row.total_earnings || 0
      const statutoryDeductions = (row.IHSS || 0) + (row.RAP || 0) + (row.ISR || 0)
      const newBruto = baseBruto + ingresosAdicionales
      const newNeto = newBruto - statutoryDeductions - deduccionesAdicionales

      // Update local preview state (NOT persisted to DB)
      setPreviewCustomFields(prev => ({
        ...prev,
        [modalState.lineId]: {
          metadata,
          eff_bruto: newBruto,
          eff_neto: newNeto
        }
      }))

      // Update local unified data for immediate preview
      const updatedRows = payroll.unifiedData.rows.map(r => {
        if (r.line_id === modalState.lineId || r.employee_id === modalState.lineId) {
          return {
            ...r,
            total_earnings: newBruto,
            total: newNeto,
            metadata: metadata
          }
        }
        return r
      })

      // Recalculate resumen
      const newResumen = updatedRows.reduce((acc, r) => {
        acc.total_bruto += r.total_earnings || 0
        acc.total_neto += r.total || 0
        acc.total_deducciones.IHSS += r.IHSS || 0
        acc.total_deducciones.RAP += r.RAP || 0
        acc.total_deducciones.ISR += r.ISR || 0
        return acc
      }, {
        empleados: updatedRows.length,
        total_bruto: 0,
        total_deducciones: { IHSS: 0, RAP: 0, ISR: 0, otros: 0 },
        total_neto: 0,
        total_dias_trabajados: payroll.unifiedData.resumen.total_dias_trabajados,
        total_horas_extras: payroll.unifiedData.resumen.total_horas_extras
      })

      // Update state directly without API call
      payroll.setUnifiedData({ rows: updatedRows, resumen: newResumen })

      setShowCustomFieldsModal(false)
      setModalState(null)
    } catch (error: unknown) {
      console.error('Error calculating custom fields:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert('Error al calcular campos personalizados: ' + errorMessage)
    }
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
        <Card variant="glass" className="border-red-500/30 bg-red-500/20">
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
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
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
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
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
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
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
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
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

      {/* Configuración de Nómina */}
      <ConfigNomina
        year={payroll.currentPeriod.year}
        month={payroll.currentPeriod.month}
        quincena={payroll.currentPeriod.quincena}
        tipo={payroll.filters.tipo}
        onYearChange={(year) => handleFilterChange('year', year)}
        onMonthChange={(month) => handleFilterChange('month', month)}
        onQuincenaChange={(quincena) => handleFilterChange('quincena', quincena)}
        onTipoChange={(tipo) => handleFilterChange('tipo', tipo)}
        onPreview={handlePreview}
        onReset={payroll.resetFilters}
        loading={payroll.loading}
        canPreview={payroll.canPreview}
      />

      {/* Unified Payroll Table */}
      {payroll.unifiedData && (
        <UnifiedPayrollTable
          rows={payroll.unifiedData.rows}
          resumen={payroll.unifiedData.resumen}
          onGenerateVoucher={payroll.generateVoucher}
          onPreAuthorize={handlePreAuthorize}
          onAuthorize={payroll.authorizeRun}
          onGeneratePDF={payroll.generatePDF}
          onSendEmail={() => payroll.sendEmail()}
          onEditCustomFields={handleEditCustomFields}
          loading={payroll.loading}
          canAuthorize={payroll.canAuthorize}
          canSend={payroll.canSend}
          runId={payroll.runId}
          status={payroll.status}
          period={payroll.currentPeriod}
          companyId={payroll.companyId}
        />
      )}

      {/* Loading State */}
      {!payroll.unifiedData && payroll.loading && (
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-blue-300 mb-2">Cargando Datos</h2>
            <p className="text-blue-200">Obteniendo información de nómina...</p>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!payroll.unifiedData && !payroll.loading && (
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
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
    </div>
  )
}
