import React, { useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Icon } from './Icon'
import { usePayrollManager } from '../lib/hooks/usePayrollManager'
import UnifiedPayrollTable from './UnifiedPayrollTable'
import ConfigNomina from './ConfigNomina'

export default function PayrollManagerNew({ companyId: propCompanyId }: { companyId?: string }) {
  // Use the new unified payroll manager
  const payroll = usePayrollManager()
  
  // Debug logging para verificar el companyId
  useEffect(() => {
    console.log('🔍 PayrollManagerNew - companyId from context:', payroll.companyId, 'loading:', payroll.companyLoading)
  }, [payroll.companyId, payroll.companyLoading])

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

  // Handle filter changes - now unified
  const handleFilterChange = async (key: string, value: any) => {
    await payroll.updateFilter(key as any, value)
  }

  // Handle unified preview - now single handler
  const handlePreview = async () => {
    try {
      await payroll.generatePreview()
    } catch (error: any) {
      // Error handling is done in the hook
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      idle: 'bg-white/20 text-gray-300',
      previewing: 'bg-blue-500/20 text-blue-300',
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
         status === 'previewing' ? 'Generando Preview' :
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
          <p className="text-gray-300">Sistema de nómina unificado con auditoría y versionado</p>
        </div>
        
        <div className="flex items-center gap-2">
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
                  { }
                  {/* {formatCurrencyShort(payroll.unifiedData?.resumen.total_bruto || payroll.metrics.totalGrossSalary)} */}
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
                  { }
                  {/* {formatCurrencyShort(
                    payroll.unifiedData?.resumen.total_deducciones 
                      ? Object.values(payroll.unifiedData.resumen.total_deducciones).reduce((a, b) => a + b, 0)
                      : payroll.metrics.totalDeductions
                  )} */}
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
                  { }
                  {/* {formatCurrencyShort(payroll.unifiedData?.resumen.total_neto || payroll.metrics.totalNetSalary)} */}
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
          onAuthorize={payroll.authorizeRun}
          onGeneratePDF={payroll.generatePDF}
          onSendEmail={() => payroll.sendEmail()}
          loading={payroll.loading}
          canAuthorize={payroll.canAuthorize}
          canSend={payroll.canSend}
          runId={payroll.runId}
          status={payroll.status}
          period={payroll.currentPeriod}
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
    </div>
  )
}
