// Componente para mostrar tabla de empleados por hora (hourly)
import React from 'react'
import { formatCurrency } from '../lib/utils/currency'
import { UnifiedRow } from '../lib/payroll-unified'
import { Button } from './ui/button'
import { Icon } from './Icon'

interface PayrollHourlyTableProps {
  rows: UnifiedRow[]
  // eslint-disable-next-line no-unused-vars
  onGenerateVoucher: (_lineId: string) => void
  // eslint-disable-next-line no-unused-vars
  onEditCustomFields?: (_lineId: string, _metadata: any, _baseSalary: number, _employeeId?: string) => void
  loading?: boolean
  hasCustom?: boolean
  statutoryDeductions?: { ihss: boolean; rap: boolean; isr: boolean }
}

export default function PayrollHourlyTable({
  rows,
  onGenerateVoucher,
  onEditCustomFields,
  loading = false,
  hasCustom = false,
  statutoryDeductions = { ihss: true, rap: true, isr: true }
}: PayrollHourlyTableProps) {
  const summary = rows.reduce((acc, r) => {
    acc.totalBruto += r.total_earnings || 0
    acc.totalDeducciones += r.total_deducciones || 0
    acc.totalNeto += r.total || 0
    acc.totalHoras += (r as any).total_hours_worked || 0
    return acc
  }, { totalBruto: 0, totalDeducciones: 0, totalNeto: 0, totalHoras: 0 })

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/20">
        Nómina — Detalle por Empleado (hourly)
      </h3>
      <div className="mb-4 grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-500/20 rounded-lg border border-blue-500/20">
          <div className="text-lg font-bold text-blue-200">{formatCurrency(summary.totalBruto)}</div>
          <div className="text-xs text-blue-200">Total Bruto</div>
        </div>
        <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-500/20">
          <div className="text-lg font-bold text-red-200">{formatCurrency(summary.totalDeducciones)}</div>
          <div className="text-xs text-red-200">Total Deducciones</div>
        </div>
        <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-500/20">
          <div className="text-lg font-bold text-green-200">{formatCurrency(summary.totalNeto)}</div>
          <div className="text-xs text-green-200">Total Neto</div>
        </div>
        <div className="text-center p-3 bg-purple-500/20 rounded-lg border border-purple-500/20">
          <div className="text-lg font-bold text-purple-200">{summary.totalHoras.toFixed(2)}h</div>
          <div className="text-xs text-purple-200">Total Horas</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/30">
          <thead className="bg-white/20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Empleado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Días Trabajados</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Total Horas Trabajadas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Horas extra (AHC)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Tarifa por Hora</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Salario Bruto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Deducciones</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Neto a Pagar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-white/20">
            {rows.length > 0 ? (
              rows.map((row) => {
                const hourlyRow = row as any
                const totalHours = hourlyRow.total_hours_worked || 0
                const hourlyRate = hourlyRow.hourly_rate || 0
                return (
                  <tr key={row.employee_id} className="hover:bg-white/10 transition-colors duration-200">
                    <td className="px-4 py-3 align-top min-w-[10rem] max-w-[18rem]">
                      <div>
                        <div className="text-sm font-medium text-white break-words leading-snug">{row.name}</div>
                        <div className="text-xs text-gray-300 break-words mt-0.5">{row.department || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                      {row.days_worked || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                      {totalHours.toFixed(2)}h
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm tabular-nums text-amber-200/95">
                      {(row.extras?.horas ?? 0) > 0 ? `${(row.extras?.horas ?? 0).toFixed(2)} h` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                      {formatCurrency(hourlyRate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-300">
                      {formatCurrency(row.total_earnings || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">
                      <div className="text-xs space-y-0.5">
                        {statutoryDeductions.ihss && (
                          <div>IHSS: {formatCurrency(row.IHSS || 0)}</div>
                        )}
                        {statutoryDeductions.rap && (
                          <div>RAP: {formatCurrency(row.RAP || 0)}</div>
                        )}
                        {statutoryDeductions.isr && (
                          <div>ISR: {formatCurrency(row.ISR || 0)}</div>
                        )}
                        <div className="font-semibold mt-1">Total: {formatCurrency(row.total_deducciones || 0)}</div>
                      </div>
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
                            onClick={() => onEditCustomFields?.(row.line_id || row.employee_id, (row as any).metadata, row.base_salary || 0, row.employee_id)}
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
                )
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No hay empleados por hora para este período
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

