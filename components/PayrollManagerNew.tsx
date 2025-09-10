import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Icon } from './Icon'
import { usePayrollState } from '../lib/hooks/usePayrollState'
import { payrollApi, openInNewTab } from '../lib/payroll-api'
import { useToast } from '../lib/toast'
import { getHondurasTimestamp } from '../lib/timezone'
import { formatCurrency, formatCurrencyShort } from '../lib/utils/currency'
import { usePayrollMetrics } from '../lib/hooks/usePayrollMetrics'
import { fetchUnifiedPayroll, getCurrentPeriod, UnifiedRow, UnifiedResumen } from '../lib/payroll-unified'
import UnifiedPayrollTable from './UnifiedPayrollTable'
import ConfigNomina from './ConfigNomina'
import { useCompanyContext } from '../lib/useCompanyContext'

export default function PayrollManagerNew() {
  const payrollState = usePayrollState()
  const toast = useToast()
  const { companyId, loading: companyLoading } = useCompanyContext()

  // Unified data state
  const [unifiedData, setUnifiedData] = useState<{ rows: UnifiedRow[]; resumen: UnifiedResumen } | null>(null)
  const [unifiedLoading, setUnifiedLoading] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState(() => getCurrentPeriod())
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use centralized metrics hook - must be called before any early returns
  const payrollMetrics = usePayrollMetrics(payrollState.planilla)

  // Load current period data on mount only once - must be called before any early returns
  useEffect(() => {
    if (hasLoadedInitialData || !companyId) return

    const abortController = new AbortController()

    const loadCurrentPeriodData = async () => {
      setUnifiedLoading(true)
      try {
        const data = await fetchUnifiedPayroll(
          companyId,
          currentPeriod.year,
          currentPeriod.month,
          currentPeriod.quincena
        )
        
        if (!abortController.signal.aborted) {
          setUnifiedData(data)
          setHasLoadedInitialData(true)
        }
      } catch (error: any) {
        if (!abortController.signal.aborted) {
          console.error('Error loading current period data:', error)
          const errorMessage = error?.message || 'Error desconocido'
          setError(`Error cargando datos: ${errorMessage}`)
          toast.error('Error', 'No se pudieron cargar los datos del período actual', 5000)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setUnifiedLoading(false)
        }
      }
    }

    loadCurrentPeriodData()

    return () => abortController.abort()
  }, [hasLoadedInitialData, toast, companyId])

  // Loading state while company is being loaded
  if (companyLoading) {
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

  // Early return if no company_id - must be after all hooks
  if (!companyId) {
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

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    payrollState.updateFilters({ [key]: value })
    setCurrentPeriod(prev => ({ ...prev, [key]: value }))
    setHasLoadedInitialData(false) // Reset to allow new data loading
  }

  // Handle unified preview
  const handleUnifiedPreview = async () => {
    if (!companyId) return
    
    setUnifiedLoading(true)
    try {
      const data = await fetchUnifiedPayroll(
        companyId,
        currentPeriod.year,
        currentPeriod.month,
        currentPeriod.quincena
      )
      setUnifiedData(data)
      toast.success(
        'Preview Generado',
        `${data.resumen.empleados} empleados procesados exitosamente`,
        5000
      )
    } catch (error: any) {
      toast.error(
        'Error en Preview',
        error.message || 'No se pudo generar el preview',
        8000
      )
    } finally {
      setUnifiedLoading(false)
    }
  }

  // Handle actions
  const handlePreview = async () => {
    try {
      await payrollState.generatePreview()
      toast.success(
        'Preview Generado',
        `${payrollState.totalEmployees} empleados procesados exitosamente`,
        5000
      )
    } catch (error: any) {
      toast.error(
        'Error en Preview',
        error.message || 'No se pudo generar el preview',
        8000
      )
    }
  }

  const handleEditLine = async (runLineId: string, field: string, newValue: number, reason?: string) => {
    try {
      await payrollState.editLine(runLineId, field, newValue, reason)
      toast.success(
        'Línea Editada',
        `Campo ${field} actualizado a ${newValue}`,
        4000
      )
    } catch (error: any) {
      toast.error(
        'Error Editando',
        error.message || 'No se pudo editar la línea',
        6000
      )
    }
  }

  const handleAuthorize = async () => {
    try {
      const response = await payrollState.authorizeRun()
      
      toast.success(
        'Nómina Autorizada',
        'La nómina ha sido autorizada exitosamente',
        6000
      )
      
      // Abrir PDF en nueva pestaña
      if (response.artifact_url) {
        openInNewTab(response.artifact_url)
        toast.info(
          'PDF Abierto',
          'El PDF se ha abierto en una nueva pestaña',
          4000
        )
      }
      
    } catch (error: any) {
      toast.error(
        'Error Autorizando',
        error.message || 'No se pudo autorizar la nómina',
        8000
      )
    }
  }

  const handleSendEmail = async (employeeId?: string) => {
    try {
      const response = await payrollState.sendEmail(employeeId)
      
      if (response.successful > 0) {
        toast.success(
          'Emails Enviados',
          `${response.successful} emails enviados exitosamente`,
          5000
        )
      }
      
      if (response.failed > 0) {
        toast.warning(
          'Algunos Emails Fallaron',
          `${response.failed} emails no se pudieron enviar`,
          8000
        )
      }
      
    } catch (error: any) {
      toast.error(
        'Error Enviando Emails',
        error.message || 'No se pudieron enviar los emails',
        8000
      )
    }
  }

  const handleGeneratePDF = async () => {
    if (!payrollState.runId) {
      toast.error('Error', 'No hay una corrida de nómina activa', 4000)
      return
    }
    
    try {
      const response = await payrollApi.generatePDF(payrollState.runId)
      // Trigger direct download instead of opening in new tab
      const link = document.createElement('a')
      link.href = response.url
      link.download = `planilla_${getHondurasTimestamp().slice(0, 7)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('PDF Generado', 'El PDF se ha descargado correctamente', 4000)
    } catch (error: any) {
      toast.error('Error Generando PDF', 'No se pudo generar el PDF', 6000)
    }
  }

  const handleGenerateVoucher = async (runLineId: string) => {
    try {
      const response = await payrollApi.generateVoucher(runLineId)
      openInNewTab(response.url)
      toast.success('Voucher Generado', 'El voucher se ha abierto en una nueva pestaña', 4000)
    } catch (error: any) {
      toast.error('Error Generando Voucher', 'No se pudo generar el voucher', 6000)
    }
  }

  // formatCurrency now imported from utils

  const getStatusBadge = (status: string) => {
    const variants = {
      idle: 'bg-white/20 text-gray-300',
      draft: 'bg-blue-500/20 text-blue-300',
      editing: 'bg-yellow-500/20 text-yellow-300',
      authorizing: 'bg-orange-500/20 text-orange-300',
      authorized: 'bg-green-500/20 text-green-300',
      distributing: 'bg-purple-500/20 text-purple-300',
      error: 'bg-red-500/20 text-red-300'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
        variants[status as keyof typeof variants] || variants.idle
      }`}>
        {status === 'idle' ? 'Inactivo' :
         status === 'draft' ? 'Borrador' :
         status === 'editing' ? 'Editando' :
         status === 'authorizing' ? 'Autorizando' :
         status === 'authorized' ? 'Autorizado' :
         status === 'distributing' ? 'Distribuyendo' :
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
          <p className="text-gray-300">Sistema de nómina con auditoría y versionado</p>
        </div>
        
        <div className="flex items-center gap-2">
          {getStatusBadge(payrollState.status)}
          
          {(payrollState.loading || unifiedLoading) && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(payrollState.error || error) && (
        <Card variant="glass" className="border-red-500/30 bg-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-300">
              <Icon name="alert" className="h-5 w-5" />
              <span className="font-medium">Error:</span>
              <span>{payrollState.error || error}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={payrollState.clearError}
              >
                Cerrar
              </Button>
              {error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  Limpiar Error
                </Button>
              )}
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
                  {unifiedLoading ? (
                    <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                  ) : (
                    unifiedData?.resumen.empleados || payrollMetrics.activeEmployees || 0
                  )}
                </p>
              </div>
              <div className="p-2 bg-blue-500/30 rounded-full">
                <Icon name="users" className="h-6 w-6 text-blue-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Salario Bruto */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total Salario Bruto</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrencyShort(unifiedData?.resumen.total_bruto || payrollMetrics.totalGrossSalary)}
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
                  {formatCurrencyShort(
                    unifiedData?.resumen.total_deducciones 
                      ? Object.values(unifiedData.resumen.total_deducciones).reduce((a, b) => a + b, 0)
                      : payrollMetrics.totalDeductions
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
                  {formatCurrencyShort(unifiedData?.resumen.total_neto || payrollMetrics.totalNetSalary)}
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
        year={currentPeriod.year}
        month={currentPeriod.month}
        quincena={currentPeriod.quincena}
        tipo={payrollState.filters.tipo}
        onYearChange={(year) => handleFilterChange('year', year)}
        onMonthChange={(month) => handleFilterChange('month', month)}
        onQuincenaChange={(quincena) => handleFilterChange('quincena', quincena)}
        onTipoChange={(tipo) => handleFilterChange('tipo', tipo)}
        onPreview={handleUnifiedPreview}
        onReset={() => {
          const newPeriod = getCurrentPeriod()
          setCurrentPeriod(newPeriod)
          payrollState.resetFilters()
        }}
        loading={unifiedLoading}
        canPreview={true}
      />

      {/* Unified Payroll Table */}
      {unifiedData && (
        <UnifiedPayrollTable
          rows={unifiedData.rows}
          resumen={unifiedData.resumen}
          onGenerateVoucher={handleGenerateVoucher}
          onAuthorize={handleAuthorize}
          onGeneratePDF={handleGeneratePDF}
          onSendEmail={() => handleSendEmail()}
          loading={unifiedLoading}
          canAuthorize={payrollState.canAuthorize}
          canSend={payrollState.canSend}
          runId={payrollState.runId}
          period={currentPeriod}
        />
      )}

      {/* Fallback to legacy table if no unified data */}
      {!unifiedData && payrollState.hasPlanilla && (
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Planilla de Nómina</CardTitle>
            <CardDescription className="text-gray-200 text-base">
              {payrollState.totalEmployees} empleados - 
              Total Bruto: {formatCurrency(payrollState.totalBruto)} - 
              Total Neto: {formatCurrency(payrollState.totalNeto)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-400">
              <Icon name="alert" className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg">Cargando datos unificados...</p>
              <p className="text-sm">Si el problema persiste, usa la configuración de nómina para generar un preview</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Editor for Editable Mode - Only show if using legacy data */}
      {payrollState.canEdit && payrollState.planilla.length > 0 && !unifiedData && (
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Editor de Líneas</CardTitle>
            <CardDescription className="text-gray-200 text-base">
              Edita los valores de la nómina antes de autorizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payrollState.planilla.map((line: any, index: number) => (
              <div key={index} className="mb-6 p-4 border border-white/20 rounded-lg">
                <h4 className="font-medium mb-3 text-white">{line.name}</h4>
                {/* PayrollLineEditor component would go here if needed */}
                <div className="text-gray-400 text-sm">Editor de líneas no disponible en modo unificado</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
