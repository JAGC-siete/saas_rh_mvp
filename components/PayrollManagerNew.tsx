import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Icon } from './Icon'
import { usePayrollState } from '../lib/hooks/usePayrollState'
import { PayrollLineEditor } from './PayrollLineEditor'
import { payrollApi, openInNewTab } from '../lib/payroll-api'
import { useToast } from '../lib/toast'

export default function PayrollManagerNew() {
  const payrollState = usePayrollState()
  const toast = useToast()

  // CÁLCULOS DE MÉTRICAS (ETAPA 2.3)
  const payrollMetrics = useMemo(() => {
    if (!payrollState.planilla.length) {
      return {
        activeEmployees: 0,
        totalGrossSalary: 0,
        totalDeductions: 0,
        totalNetSalary: 0,
        totalIHSS: 0,
        totalRAP: 0,
        totalISR: 0,
        totalDaysWorked: 0,
        payrollCoverage: 0,
        attendanceRate: 0,
        averageSalary: 0,
        departmentBreakdown: {}
      }
    }

    const planilla = payrollState.planilla
    const totalGrossSalary = planilla.reduce((sum, line) => sum + (line.total_earnings || 0), 0)
    const totalIHSS = planilla.reduce((sum, line) => sum + (line.IHSS || 0), 0)
    const totalRAP = planilla.reduce((sum, line) => sum + (line.RAP || 0), 0)
    const totalISR = planilla.reduce((sum, line) => sum + (line.ISR || 0), 0)
    const totalDeductions = totalIHSS + totalRAP + totalISR
    const totalNetSalary = totalGrossSalary - totalDeductions
    const totalDaysWorked = planilla.reduce((sum, line) => sum + (line.days_worked || 0), 0)
    
    // Cálculos adicionales
    const activeEmployees = planilla.length
    const averageSalary = activeEmployees > 0 ? totalGrossSalary / activeEmployees : 0
    const payrollCoverage = activeEmployees > 0 ? 100 : 0 // Porcentaje de cobertura
    
    // Breakdown por departamento
    const departmentBreakdown = planilla.reduce((acc, line) => {
      const dept = line.department || 'Sin Departamento'
      if (!acc[dept]) {
        acc[dept] = { count: 0, name: dept, avgSalary: 0, totalSalary: 0 }
      }
      acc[dept].count++
      acc[dept].totalSalary += (line.total_earnings || 0)
      acc[dept].avgSalary = acc[dept].totalSalary / acc[dept].count
      return acc
    }, {} as Record<string, { count: number, name: string, avgSalary: number, totalSalary: number }>)

    return {
      activeEmployees,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      totalIHSS,
      totalRAP,
      totalISR,
      totalDaysWorked,
      payrollCoverage,
      attendanceRate: 100, // Placeholder - se calculará con datos reales de asistencia
      averageSalary,
      departmentBreakdown
    }
  }, [payrollState.planilla])

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
      openInNewTab(response.url)
      toast.success('PDF Generado', 'El PDF se ha abierto en una nueva pestaña', 4000)
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      idle: 'bg-gray-100 text-gray-800',
      draft: 'bg-blue-100 text-blue-800',
      editing: 'bg-yellow-100 text-yellow-800',
      authorizing: 'bg-orange-100 text-orange-800',
      authorized: 'bg-green-100 text-green-800',
      distributing: 'bg-purple-100 text-purple-800',
      error: 'bg-red-100 text-red-800'
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Nómina</h1>
          <p className="text-gray-600">Sistema de nómina con auditoría y versionado</p>
        </div>
        
        <div className="flex items-center gap-2">
          {getStatusBadge(payrollState.status)}
          
          {payrollState.loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {payrollState.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
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
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados Activos</p>
                <p className="text-2xl font-bold text-gray-900">{payrollMetrics.activeEmployees}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Icon name="users" className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Salario Bruto */}
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Salario Bruto</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('es-HN', { 
                    style: 'currency', 
                    currency: 'HNL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(payrollMetrics.totalGrossSalary)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <Icon name="money" className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Total Deducciones */}
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deducciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('es-HN', { 
                    style: 'currency', 
                    currency: 'HNL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(payrollMetrics.totalDeductions)}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <Icon name="chart" className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Salario Neto */}
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Salario Neto</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('es-HN', { 
                    style: 'currency', 
                    currency: 'HNL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(payrollMetrics.totalNetSalary)}
                </p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-full">
                <Icon name="money" className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fila 2: Métricas Secundarias */}
        
        {/* 5. Total IHSS */}
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total IHSS</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('es-HN', { 
                    style: 'currency', 
                    currency: 'HNL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(payrollMetrics.totalIHSS)}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Icon name="building" className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Total RAP */}
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total RAP</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('es-HN', { 
                    style: 'currency', 
                    currency: 'HNL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(payrollMetrics.totalRAP)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Icon name="shield" className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Total ISR */}
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total ISR</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('es-HN', { 
                    style: 'currency', 
                    currency: 'HNL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(payrollMetrics.totalISR)}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <Icon name="calculator" className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 8. Total Días Trabajados */}
        <Card className="hover:scale-105 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Días Trabajados</p>
                <p className="text-2xl font-bold text-gray-900">{payrollMetrics.totalDaysWorked}</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-full">
                <Icon name="calendar" className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionales - Solo visible en pantallas grandes */}
      <div className="hidden xl:grid xl:grid-cols-3 gap-6">
        {/* Promedio de Salario */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Salario Promedio</p>
                <p className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat('es-HN', { 
                    style: 'currency', 
                    currency: 'HNL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(payrollMetrics.averageSalary)}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <Icon name="target" className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cobertura de Nómina */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cobertura de Nómina</p>
                <p className="text-xl font-bold text-gray-900">{payrollMetrics.payrollCoverage}%</p>
              </div>
              <div className="p-2 bg-teal-100 rounded-full">
                <Icon name="check" className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Asistencia */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasa de Asistencia</p>
                <p className="text-xl font-bold text-gray-900">{payrollMetrics.attendanceRate}%</p>
              </div>
              <div className="p-2 bg-cyan-100 rounded-full">
                <Icon name="clock" className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Nómina</CardTitle>
          <CardDescription>
            Define los parámetros para generar la nómina (año, mes, quincena y tipo de deducciones)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Año */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <Select
                value={payrollState.filters.year.toString()}
                onValueChange={(value) => handleFilterChange('year', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mes */}
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
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
                      {new Date(2024, month - 1).toLocaleDateString('es-HN', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quincena */}
            <div>
              <label htmlFor="quincena" className="block text-sm font-medium text-gray-700 mb-2">Quincena</label>
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
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
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

      {/* Planilla Display */}
      {payrollState.hasPlanilla && (
        <Card>
          <CardHeader>
            <CardTitle>Planilla de Nómina</CardTitle>
            <CardDescription>
              {payrollState.totalEmployees} empleados - 
              Total Bruto: {formatCurrency(payrollState.totalBruto)} - 
              Total Neto: {formatCurrency(payrollState.totalNeto)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Planilla Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días Trabajados</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario Bruto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IHSS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deducciones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario Neto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollState.planilla.map((line: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{line.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.days_worked}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(line.total_earnings)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(line.IHSS)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(line.RAP)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(line.ISR)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(line.total_deducciones)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(line.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateVoucher(line.line_id)}
                            disabled={payrollState.loading}
                          >
                            <Icon name="download" className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-6">
              <Button
                onClick={handleAuthorize}
                disabled={!payrollState.canAuthorize || payrollState.loading}
                className="flex items-center gap-2"
              >
                <Icon name="check" className="h-4 w-4" />
                {payrollState.loading ? 'Autorizando...' : 'Autorizar Nómina'}
              </Button>

              <Button
                onClick={handleGeneratePDF}
                disabled={!payrollState.runId || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon name="document" className="h-4 w-4" />
                Generar PDF
              </Button>

              <Button
                onClick={() => handleSendEmail()}
                disabled={!payrollState.canSend || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon name="envelope" className="h-4 w-4" />
                Enviar por Email
              </Button>

              <Button
                onClick={() => toast.info('WhatsApp', 'Feature en desarrollo - We will implement that later. Forget it for now.', 6000)}
                disabled={!payrollState.canSend || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon name="whatsapp" className="h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Editor for Editable Mode */}
      {payrollState.canEdit && payrollState.planilla.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Editor de Líneas</CardTitle>
            <CardDescription>
              Edita los valores de la nómina antes de autorizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payrollState.planilla.map((line: any, index: number) => (
              <div key={index} className="mb-6 p-4 border rounded-lg">
                <h4 className="font-medium mb-3">{line.name}</h4>
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
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Nómina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{payrollState.totalEmployees}</div>
                <div className="text-sm text-blue-600">Empleados</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(payrollState.totalBruto)}</div>
                <div className="text-sm text-green-600">Total Bruto</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(payrollState.totalDeducciones)}</div>
                <div className="text-sm text-red-600">Total Deducciones</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(payrollState.totalNeto)}</div>
                <div className="text-sm text-purple-600">Total Neto</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
