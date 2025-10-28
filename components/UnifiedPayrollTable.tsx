// Unified Payroll Table Component
// Combines planilla and detalle data in a single expandable table

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Icon, IconName } from './Icon'
import { formatCurrency } from '../lib/utils/currency'
import { UnifiedRow, UnifiedResumen } from '../lib/payroll-unified'
import { extractCustomFields, calculateProhalcaPayroll, hasCustomFields, getCustomFields, getPayrollConfig } from '../lib/payroll-client-specific'

interface UnifiedPayrollTableProps {
  rows: UnifiedRow[]
  resumen: UnifiedResumen
  onGenerateVoucher: (lineId: string) => void
  onAuthorize: () => void
  onGeneratePDF: () => void
  onSendEmail: () => void
  onEditCustomFields?: (lineId: string, metadata: any) => void
  loading?: boolean
  canAuthorize?: boolean
  canSend?: boolean
  runId?: string
  status?: string
  period: {
    year: number
    month: number
    quincena: number
  }
  companyId?: string
}

export default function UnifiedPayrollTable({
  rows,
  resumen,
  onGenerateVoucher,
  onAuthorize,
  onGeneratePDF,
  onSendEmail,
  onEditCustomFields,
  loading = false,
  canAuthorize = false,
  canSend = false,
  runId,
  status,
  period,
  companyId
}: UnifiedPayrollTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  // Get payroll configuration for this company
  const payrollConfig = companyId ? getPayrollConfig(companyId) : null
  const hasCustom = hasCustomFields(companyId || '')

  const toggleRow = (employeeId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId)
    } else {
      newExpanded.add(employeeId)
    }
    setExpandedRows(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completo: 'bg-green-500/30 text-green-200 border border-green-500/20',
      sin_planilla: 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/20',
      sin_asistencia: 'bg-orange-500/30 text-orange-200 border border-orange-500/20'
    }
    
    const labels = {
      completo: 'Completo',
      sin_planilla: 'Sin Planilla',
      sin_asistencia: 'Sin Asistencia'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        variants[status as keyof typeof variants] || variants.completo
      }`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
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
    const isAuthorized = status === 'authorized'
    const isAuthorizing = loading && status === 'authorizing'
    
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
      disabled: !canAuthorize || loading,
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
          {resumen.empleados} empleados • 
          Total Bruto: {formatCurrency(resumen.total_bruto)} • 
          Total Neto: {formatCurrency(resumen.total_neto)} • 
          Período: {monthName} {period.year} Q{period.quincena}
        </CardDescription>
      </CardHeader>
      <CardContent>
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

        {/* Unified Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/30">
            <thead className="bg-white/20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Salario Base
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Días Trab.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Horas Extras
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Salario Quincenal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Deducciones
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Salario Neto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/20">
              {Array.isArray(rows) && rows.length > 0 ? (
                rows.map((row, index) => (
                  <React.Fragment key={row.employee_id}>
                    <tr className="hover:bg-white/10 transition-colors duration-200">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleRow(row.employee_id)}
                            className="mr-2 text-white hover:text-gray-300"
                          >
                            {expandedRows.has(row.employee_id) ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-medium text-white">{row.name}</div>
                            <div className="text-xs text-gray-300">{row.department || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(row.status || 'completo')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                        {formatCurrency(row.base_salary || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                        {row.days_worked || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                        {row.extras?.horas || 0}h
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-300">
                        {formatCurrency(row.total_earnings || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">
                        {formatCurrency(row.total_deducciones || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-white">
                        {formatCurrency(row.total || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onGenerateVoucher(row.line_id || row.employee_id)}
                            disabled={loading}
                            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                            title="Descargar comprobante"
                          >
                            <Icon name="download" className="h-4 w-4" />
                          </Button>
                          {hasCustom && onEditCustomFields && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditCustomFields?.(row.line_id || row.employee_id, (row as any).metadata)}
                              disabled={loading}
                              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                              title="Editar campos personalizados"
                            >
                              <Icon name="edit" className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row Details */}
                    {expandedRows.has(row.employee_id) && (
                      <tr className="bg-white/5">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Deducciones Breakdown */}
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Desglose de Deducciones</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-gray-200">
                                  <span>IHSS:</span>
                                  <span className="text-red-300">{formatCurrency(row.IHSS || 0)}</span>
                                </div>
                                <div className="flex justify-between text-gray-200">
                                  <span>RAP:</span>
                                  <span className="text-red-300">{formatCurrency(row.RAP || 0)}</span>
                                </div>
                                <div className="flex justify-between text-gray-200">
                                  <span>ISR:</span>
                                  <span className="text-red-300">{formatCurrency(row.ISR || 0)}</span>
                                </div>
                                <div className="flex justify-between text-gray-200">
                                  <span>Otros:</span>
                                  <span className="text-red-300">
                                    {formatCurrency((row.total_deducciones || 0) - (row.IHSS || 0) - (row.RAP || 0) - (row.ISR || 0))}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Asistencia Details */}
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Detalles de Asistencia</h4>
                              <div className="space-y-1 text-sm text-gray-200">
                                <div>Días trabajados: {row.days_worked || 0}</div>
                                <div>Días ausentes: {row.days_absent || 0}</div>
                                <div>Días tarde: {row.late_days || 0}</div>
                                <div>Horas extras: {row.extras?.horas || 0}h</div>
                              </div>
                            </div>

                            {/* Observaciones */}
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Observaciones</h4>
                              <p className="text-sm text-gray-200">
                                {row.observaciones || 'Sin observaciones'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Custom Fields (PROHALCA-specific) */}
                          {hasCustom && payrollConfig && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <h4 className="text-sm font-semibold text-white mb-2">Campos Específicos de PROHALCA</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Get custom fields from metadata if available */}
                                {(() => {
                                  const metadata = (row as any).metadata
                                  const customFields = metadata ? extractCustomFields(companyId || '', metadata) : {}
                                  const calculatedFields = metadata && row.total_earnings ? calculateProhalcaPayroll(row.total_earnings, metadata) : null
                                  
                                  if (!customFields || Object.keys(customFields).length === 0) {
                                    return (
                                      <p className="text-sm text-gray-400">No hay campos adicionales</p>
                                    )
                                  }
                                  
                                  return (
                                    <>
                                      {/* Earnings */}
                                      {payrollConfig.customFields && Object.keys(payrollConfig.customFields).map((fieldName) => {
                                        if (fieldName.includes('horas_extras') || fieldName.includes('feriado') || fieldName.includes('transporte')) {
                                          const value = customFields[fieldName] || (calculatedFields as any)?.[fieldName] || 0
                                          const label = payrollConfig.customFields![fieldName]
                                          return (
                                            <div key={fieldName} className="flex justify-between text-sm text-gray-200">
                                              <span>{label}:</span>
                                              <span className="text-green-300">{formatCurrency(value)}</span>
                                            </div>
                                          )
                                        }
                                        return null
                                      })}
                                      
                                      {/* Deductions */}
                                      {payrollConfig.customFields && Object.keys(payrollConfig.customFields).map((fieldName) => {
                                        if (!fieldName.includes('horas_extras') && !fieldName.includes('feriado') && !fieldName.includes('transporte') && !fieldName.includes('valor') && !fieldName.includes('descanso') && !fieldName.includes('doble') && !fieldName.includes('pausa')) {
                                          const value = customFields[fieldName] || (calculatedFields as any)?.[fieldName] || 0
                                          const label = payrollConfig.customFields![fieldName]
                                          if (value > 0) {
                                            return (
                                              <div key={fieldName} className="flex justify-between text-sm text-gray-200">
                                                <span>{label}:</span>
                                                <span className="text-red-300">{formatCurrency(value)}</span>
                                              </div>
                                            )
                                          }
                                        }
                                        return null
                                      })}
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-lg">
                    {!Array.isArray(rows) ? 'Error cargando datos' : 'Sin registros de nómina para el período seleccionado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/20">
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

          <Button
            onClick={onGeneratePDF}
            disabled={!runId || loading}
            variant="outline"
            className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Icon name="document" className="h-4 w-4" />
            Generar PDF
          </Button>

          <Button
            onClick={onSendEmail}
            disabled={!canSend || loading}
            variant="outline"
            className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Icon name="envelope" className="h-4 w-4" />
            Enviar por Email
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
