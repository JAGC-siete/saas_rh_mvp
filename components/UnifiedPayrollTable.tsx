// Unified Payroll Table Component
// Combines planilla and detalle data in a single expandable table

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Icon, IconName } from './Icon'
import { formatCurrency } from '../lib/utils/currency'
import { UnifiedRow, UnifiedResumen } from '../lib/payroll-unified'
import { extractCustomFields, calculatePayroll } from '../lib/payroll-client-specific'
import { createClient } from '../lib/supabase/client'
import { Pagination } from './ui/pagination'

interface UnifiedPayrollTableProps {
  rows: UnifiedRow[]
  resumen: UnifiedResumen
  onGenerateVoucher: (lineId: string) => void
  onPreAuthorize?: () => void
  onAuthorize: () => void
  onGeneratePDF: () => void
  onSendEmail: () => void
  onEditCustomFields?: (lineId: string, metadata: any, baseSalary: number) => void
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
  onPreAuthorize,
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [sortBy, setSortBy] = useState<'name' | 'department'>('name')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [hasCustom, setHasCustom] = useState(false)
  const [payrollConfig, setPayrollConfig] = useState<any>(null)
  
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
  }, [companyId])

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

  // Filter and sort employees
  const filteredAndSortedRows = useMemo(() => {
    let filtered = [...rows]

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
  }, [rows, departmentFilter, sortBy, sortOrder])

  // Paginate results
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedRows.slice(startIndex, endIndex)
  }, [filteredAndSortedRows, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedRows.length / itemsPerPage)

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const toggleSortBy = () => {
    setSortBy(prev => prev === 'name' ? 'department' : 'name')
  }

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

        {/* Filters and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-white">Departamento:</label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value)
                setCurrentPage(1)
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
            Mostrando {filteredAndSortedRows.length} de {rows.length} empleados
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
              {Array.isArray(paginatedRows) && paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => (
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
                              onClick={() => onEditCustomFields?.(row.line_id || row.employee_id, (row as any).metadata, row.base_salary || 0)}
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
                          
                          {/* Custom Fields (Client-specific) */}
                          {hasCustom && payrollConfig && (() => {
                            const metadata = (row as any).metadata
                            if (!metadata || Object.keys(metadata).length === 0) {
                              return (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                  <p className="text-sm text-gray-400">No hay campos adicionales</p>
                                </div>
                              )
                            }
                            
                            // Display metadata fields directly
                            const earningsFields = ['horas_extras', 'feriado_trabajado', 'estipendio_transporte', 'incapacidad']
                            const helperFields = ['valor_hora_extra', 'descanso_por_turno_noche', 'doble_turno', 'pausa_almuerzo', 'dias_faltados']
                            
                            const earnings: Array<{key: string, label: string, value: number}> = []
                            const deductions: Array<{key: string, label: string, value: number}> = []
                            
                            if (payrollConfig.customFields) {
                              Object.keys(payrollConfig.customFields).forEach(fieldName => {
                                const value = parseFloat(metadata[fieldName] || '0')
                                const fieldDef = payrollConfig.customFields![fieldName]
                                const label = typeof fieldDef === 'string' ? fieldDef : (fieldDef as any)?.label || fieldName
                                
                                // Skip helper fields
                                if (helperFields.includes(fieldName)) {
                                  return
                                }
                                
                                // Categorize
                                if (earningsFields.includes(fieldName)) {
                                  if (value > 0 || metadata[fieldName] !== undefined) {
                                    earnings.push({ key: fieldName, label, value })
                                  }
                                } else {
                                  if (value > 0 || metadata[fieldName] !== undefined) {
                                    deductions.push({ key: fieldName, label, value })
                                  }
                                }
                              })
                            }
                            
                            return (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <h4 className="text-sm font-semibold text-white mb-2">Campos Específicos de {payrollConfig.companyName || 'Cliente'}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Earnings */}
                                  {earnings.length > 0 && (
                                    <div className="col-span-full">
                                      <h5 className="text-xs font-semibold text-green-300 mb-2">Ingresos Adicionales</h5>
                                    </div>
                                  )}
                                  {earnings.map(({ key, label, value }) => (
                                    <div key={key} className="flex justify-between text-sm text-gray-200">
                                      <span>{label}:</span>
                                      <span className="text-green-300">{formatCurrency(value)}</span>
                                    </div>
                                  ))}
                                  
                                  {/* Deductions */}
                                  {deductions.length > 0 && (
                                    <div className="col-span-full mt-2">
                                      <h5 className="text-xs font-semibold text-red-300 mb-2">Deducciones Adicionales</h5>
                                    </div>
                                  )}
                                  {deductions.map(({ key, label, value }) => (
                                    <div key={key} className="flex justify-between text-sm text-gray-200">
                                      <span>{label}:</span>
                                      <span className="text-red-300">{formatCurrency(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAndSortedRows.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
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

          {/* Generate PDF - Only enabled after authorization */}
          <Button
            onClick={onGeneratePDF}
            disabled={!runId || loading || status !== 'authorized'}
            variant="outline"
            className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
            title={status !== 'authorized' ? 'Autorice la nómina primero para generar PDF' : 'Generar PDF consolidado'}
          >
            <Icon name="document" className="h-4 w-4" />
            Generar PDF
          </Button>

          {/* Send Email - Only enabled after PDF generation (tracked separately) */}
          <Button
            onClick={onSendEmail}
            disabled={!runId || loading || status !== 'authorized'}
            variant="outline"
            className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
            title={status !== 'authorized' ? 'Autorice y genere PDF primero' : 'Enviar recibos por email'}
          >
            <Icon name="envelope" className="h-4 w-4" />
            Enviar por Email
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
