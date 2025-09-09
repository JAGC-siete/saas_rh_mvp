import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Icon } from './Icon'
import { usePayrollState } from '../lib/hooks/usePayrollState'
// PayrollLineEditor only used in edit mode - keeping for now
import { PayrollLineEditor } from './PayrollLineEditor'
import { payrollApi, openInNewTab } from '../lib/payroll-api'
import { useToast } from '../lib/toast'
import { getHondurasTimestamp, nowInHonduras } from '../lib/timezone'
import { formatCurrency, formatCurrencyShort } from '../lib/utils/currency'
import { usePayrollMetrics } from '../lib/hooks/usePayrollMetrics'

export default function PayrollManagerNew() {
  const payrollState = usePayrollState()
  const toast = useToast()

  // Use centralized metrics hook
  const payrollMetrics = usePayrollMetrics(payrollState.planilla)

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    payrollState.updateFilters({ [key]: value })
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
          
          {payrollState.loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {payrollState.error && (
        <Card variant="glass" className="border-red-500/30 bg-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-300">
              <Icon name="alert" className="h-5 w-5" />
              <span className="font-medium">Error:</span>
              <span>{payrollState.error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={payrollState.clearError}
              className="mt-2"
            >
              Cerrar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* DASHBOARD DE MÉTRICAS - GRID RESPONSIVE (ETAPA 1.2 + 1.3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Fila 1: Métricas Principales */}
        
        {/* 1. Empleados Activos */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Empleados Activos</p>
                <p className="text-2xl font-bold text-white">{payrollMetrics.activeEmployees}</p>
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
                  {formatCurrencyShort(payrollMetrics.totalGrossSalary)}
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
                  {formatCurrencyShort(payrollMetrics.totalDeductions)}
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
                  {formatCurrencyShort(payrollMetrics.totalNetSalary)}
                </p>
              </div>
              <div className="p-2 bg-emerald-500/30 rounded-full">
                <Icon name="money" className="h-6 w-6 text-emerald-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fila 2: Métricas Secundarias */}
        
        {/* 5. Total IHSS */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total IHSS</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrencyShort(payrollMetrics.totalIHSS)}
                </p>
              </div>
              <div className="p-2 bg-blue-500/30 rounded-full">
                <Icon name="building" className="h-6 w-6 text-blue-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Total RAP */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total RAP</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrencyShort(payrollMetrics.totalRAP)}
                </p>
              </div>
              <div className="p-2 bg-purple-500/30 rounded-full">
                <Icon name="shield" className="h-6 w-6 text-purple-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Total ISR */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total ISR</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrencyShort(payrollMetrics.totalISR)}
                </p>
              </div>
              <div className="p-2 bg-orange-500/30 rounded-full">
                <Icon name="calculator" className="h-6 w-6 text-orange-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 8. Total Días Trabajados */}
        <Card variant="glass" className="hover:scale-105 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Total Días Trabajados</p>
                <p className="text-2xl font-bold text-white">{payrollMetrics.totalDaysWorked}</p>
              </div>
              <div className="p-2 bg-indigo-500/30 rounded-full">
                <Icon name="calendar" className="h-6 w-6 text-indigo-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionales - Solo visible en pantallas grandes */}
      <div className="hidden xl:grid xl:grid-cols-3 gap-6">
        {/* Promedio de Salario */}
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Salario Promedio</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrencyShort(payrollMetrics.averageSalary)}
                </p>
              </div>
              <div className="p-2 bg-yellow-500/30 rounded-full">
                <Icon name="target" className="h-5 w-5 text-yellow-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cobertura de Nómina */}
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Cobertura de Nómina</p>
                <p className="text-xl font-bold text-white">{payrollMetrics.payrollCoverage}%</p>
              </div>
              <div className="p-2 bg-teal-500/30 rounded-full">
                <Icon name="check" className="h-5 w-5 text-teal-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Asistencia */}
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Tasa de Asistencia</p>
                <p className="text-xl font-bold text-white">{payrollMetrics.attendanceRate}%</p>
              </div>
              <div className="p-2 bg-cyan-500/30 rounded-full">
                <Icon name="clock" className="h-5 w-5 text-cyan-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-xl font-semibold">Configuración de Nómina</CardTitle>
          <CardDescription className="text-gray-200 text-base">
            Define los parámetros para generar la nómina (año, mes, quincena y tipo de deducciones)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Año */}
            <div>
              <label htmlFor="year" className="block text-sm font-semibold text-gray-200 mb-2">Año</label>
              <Select
                value={payrollState.filters.year.toString()}
                onValueChange={(value) => handleFilterChange('year', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => nowInHonduras().getFullYear() - 2 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mes */}
            <div>
              <label htmlFor="month" className="block text-sm font-semibold text-gray-200 mb-2">Mes</label>
              <Select
                value={payrollState.filters.month.toString()}
                onValueChange={(value) => handleFilterChange('month', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(payrollState.filters.year, month - 1).toLocaleDateString('es-HN', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quincena */}
            <div>
              <label htmlFor="quincena" className="block text-sm font-semibold text-gray-200 mb-2">Quincena</label>
              <Select
                value={payrollState.filters.quincena.toString()}
                onValueChange={(value) => handleFilterChange('quincena', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar quincena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (1-15)</SelectItem>
                  <SelectItem value="2">2 (16-31)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div>
              <label htmlFor="tipo" className="block text-sm font-semibold text-gray-200 mb-2">Tipo</label>
              <Select
                value={payrollState.filters.tipo}
                onValueChange={(value) => handleFilterChange('tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CON">Con deducciones</SelectItem>
                  <SelectItem value="SIN">Sin deducciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-6">
            <Button
              onClick={handlePreview}
              disabled={!payrollState.canPreview || payrollState.loading}
              className="flex items-center gap-2"
            >
              <Icon name="eye" className="h-4 w-4" />
              {payrollState.loading ? 'Generando...' : 'Generar Preview'}
            </Button>

            <Button
              variant="outline"
              onClick={payrollState.resetFilters}
              disabled={payrollState.loading}
            >
              Resetear Filtros
            </Button>

            {payrollState.canReset && (
              <Button
                variant="outline"
                onClick={payrollState.resetState}
                disabled={payrollState.loading}
              >
                Resetear Estado
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* UNIFIED PAYROLL TABLE - Detalle por empleado + Planilla de Nómina */}
      {payrollState.hasPlanilla && (
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Planilla de Nómina - Detalle por Empleado</CardTitle>
            <CardDescription className="text-gray-200 text-base">
              {payrollState.totalEmployees} empleados - 
              Total Bruto: {formatCurrency(payrollState.totalBruto)} - 
              Total Neto: {formatCurrency(payrollState.totalNeto)} - 
              Período: {new Date(payrollState.filters.year, payrollState.filters.month - 1).toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })} Q{payrollState.filters.quincena}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Unified Table with better readability */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/30">
                <thead className="bg-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Depto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Salario Base</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Días Trab.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Ausentes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Tardes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Salario Bruto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">IHSS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">RAP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">ISR</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Total Ded.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Salario Neto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-white/20">
                  {payrollState.planilla.map((line: any, index: number) => (
                    <tr key={index} className="hover:bg-white/10 transition-colors duration-200">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{line.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{line.department || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{formatCurrency(line.base_salary || 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{line.days_worked || 0}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{line.days_absent || 0}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{line.late_days || 0}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-300">{formatCurrency(line.total_earnings || 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">{formatCurrency(line.IHSS || 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">{formatCurrency(line.RAP || 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">{formatCurrency(line.ISR || 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-300">{formatCurrency(line.total_deducciones || 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-white">{formatCurrency(line.total || 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateVoucher(line.line_id)}
                            disabled={payrollState.loading}
                            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                          >
                            <Icon name="download" className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payrollState.planilla.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-gray-400 text-lg">
                        Sin registros de nómina para el período seleccionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/20">
              <Button
                onClick={handleAuthorize}
                disabled={!payrollState.canAuthorize || payrollState.loading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Icon name="check" className="h-4 w-4" />
                {payrollState.loading ? 'Autorizando...' : 'Autorizar Nómina'}
              </Button>

              <Button
                onClick={handleGeneratePDF}
                disabled={!payrollState.runId || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Icon name="document" className="h-4 w-4" />
                Generar PDF
              </Button>

              <Button
                onClick={() => handleSendEmail()}
                disabled={!payrollState.canSend || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Icon name="envelope" className="h-4 w-4" />
                Enviar por Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Editor for Editable Mode */}
      {payrollState.canEdit && payrollState.planilla.length > 0 && (
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
                <PayrollLineEditor
                  line={line}
                  onEdit={handleEditLine}
                  isEditing={payrollState.canEdit}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {payrollState.hasPlanilla && (
        <Card variant="glass" className="backdrop-blur-md bg-white/10 border border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Resumen de Nómina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-500/30 rounded-lg border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-200">{payrollState.totalEmployees}</div>
                <div className="text-sm font-semibold text-blue-200">Empleados</div>
              </div>
              
              <div className="text-center p-4 bg-green-500/30 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-200">{formatCurrency(payrollState.totalBruto)}</div>
                <div className="text-sm font-semibold text-green-200">Total Bruto</div>
              </div>
              
              <div className="text-center p-4 bg-red-500/30 rounded-lg border border-red-500/20">
                <div className="text-2xl font-bold text-red-200">{formatCurrency(payrollState.totalDeducciones)}</div>
                <div className="text-sm font-semibold text-red-200">Total Deducciones</div>
              </div>
              
              <div className="text-center p-4 bg-purple-500/30 rounded-lg border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-200">{formatCurrency(payrollState.totalNeto)}</div>
                <div className="text-sm font-semibold text-purple-200">Total Neto</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
