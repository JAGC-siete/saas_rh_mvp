// Componente para mostrar tabla de empleados fijos (fixed)
import React, { useState } from 'react'
import { formatCurrency } from '../lib/utils/currency'
import { UnifiedRow } from '../lib/payroll-unified'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Icon } from './Icon'

interface PayrollFixedTableProps {
  rows: UnifiedRow[]
  // eslint-disable-next-line no-unused-vars
  onGenerateVoucher: (_lineId: string) => void
  // eslint-disable-next-line no-unused-vars
  onEditCustomFields?: (_lineId: string, _metadata: any, _baseSalary: number, _employeeId?: string) => void
  /** Recalcula bruto/deducciones/neto en servidor (solo corrida draft/edited) */
  canAdjustFixedDays?: boolean
  /** Para mensajes cuando el botón de días está deshabilitado */
  payrollRunStatus?: string
  // eslint-disable-next-line no-unused-vars
  onAdjustFixedDays?: (_payload: {
    run_line_id: string
    days_worked: number
    reason?: string
  }) => Promise<void>
  loading?: boolean
  hasCustom?: boolean
  statutoryDeductions?: { ihss: boolean; rap: boolean; isr: boolean }
}

export default function PayrollFixedTable({
  rows,
  onGenerateVoucher,
  onEditCustomFields,
  canAdjustFixedDays = false,
  payrollRunStatus,
  onAdjustFixedDays,
  loading = false,
  hasCustom = false,
  statutoryDeductions = { ihss: true, rap: true, isr: true }
}: PayrollFixedTableProps) {
  const [daysModal, setDaysModal] = useState<{
    runLineId: string
    employeeName: string
    currentDays: number
  } | null>(null)
  const [daysInput, setDaysInput] = useState('')
  const [daysReason, setDaysReason] = useState('')
  const [daysSaving, setDaysSaving] = useState(false)

  const openDaysModal = (row: UnifiedRow) => {
    const runLineId = row.line_id
    if (!runLineId) {
      alert('No hay línea de corrida para este empleado. Genere vista previa primero.')
      return
    }
    setDaysModal({
      runLineId,
      employeeName: row.name || 'Empleado',
      currentDays: row.days_worked ?? 0
    })
    setDaysInput(String(row.days_worked ?? 0))
    setDaysReason('')
  }

  const closeDaysModal = () => {
    setDaysModal(null)
    setDaysInput('')
    setDaysReason('')
  }

  const submitDaysAdjust = async () => {
    if (!daysModal || !onAdjustFixedDays) return
    const n = parseInt(daysInput, 10)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      alert('Ingrese un número entero de días ≥ 0')
      return
    }
    setDaysSaving(true)
    try {
      await onAdjustFixedDays({
        run_line_id: daysModal.runLineId,
        days_worked: n,
        reason: daysReason.trim() || undefined
      })
      setDaysModal(null)
      setDaysInput('')
      setDaysReason('')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Error al ajustar días')
    } finally {
      setDaysSaving(false)
    }
  }

  const summary = rows.reduce((acc, r) => {
    acc.totalBruto += r.total_earnings || 0
    acc.totalDeducciones += r.total_deducciones || 0
    acc.totalNeto += r.total || 0
    return acc
  }, { totalBruto: 0, totalDeducciones: 0, totalNeto: 0 })

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/20">
        Nómina — Empleados Fijos (fixed)
      </h3>
      <div className="mb-4 grid grid-cols-3 gap-4">
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
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/30">
          <thead className="bg-white/20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Empleado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Salario Base Mensual</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Días Trabajados</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Salario Proporcional</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Deducciones</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Neto a Pagar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-white/20">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.employee_id} className="hover:bg-white/10 transition-colors duration-200">
                  <td className="px-4 py-3 align-top min-w-[10rem] max-w-[18rem]">
                    <div>
                      <div className="text-sm font-medium text-white break-words leading-snug">{row.name}</div>
                      <div className="text-xs text-gray-300 break-words mt-0.5">{row.department || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    {formatCurrency(row.base_salary || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums font-medium text-white">{row.days_worked || 0}</span>
                      {onAdjustFixedDays && row.line_id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openDaysModal(row)}
                          disabled={loading || !canAdjustFixedDays}
                          className="h-8 gap-1.5 border-white/30 bg-white/10 px-2.5 text-xs text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            canAdjustFixedDays
                              ? 'Ajustar días del período y recalcular bruto, deducciones y neto'
                              : `No se pueden editar días con la corrida en estado "${payrollRunStatus || 'actual'}". Debe estar en borrador o consolidada (sin autorizar).`
                          }
                        >
                          <Icon name="edit" className="h-3.5 w-3.5 shrink-0" />
                          Editar días
                        </Button>
                      ) : null}
                    </div>
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
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No hay empleados fijos para este período
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {daysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/20 bg-gray-900 p-6 text-white shadow-xl">
            <h3 className="text-lg font-semibold">Ajustar días trabajados</h3>
            <p className="mt-1 text-sm text-gray-300">{daysModal.employeeName}</p>
            <p className="mt-2 text-xs text-amber-200/90">
              Se recalculan salario proporcional, deducciones de ley y planes como en la vista previa.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="adj-days" className="block text-sm font-medium text-gray-200">
                  Días trabajados (período)
                </label>
                <Input
                  id="adj-days"
                  type="number"
                  min={0}
                  step={1}
                  value={daysInput}
                  onChange={(e) => setDaysInput(e.target.value)}
                  className="mt-1 border-white/20 bg-white/10 text-white"
                />
              </div>
              <div>
                <label htmlFor="adj-reason" className="block text-sm font-medium text-gray-200">
                  Motivo (opcional)
                </label>
                <Textarea
                  id="adj-reason"
                  value={daysReason}
                  onChange={(e) => setDaysReason(e.target.value)}
                  rows={2}
                  className="mt-1 border-white/20 bg-white/10 text-white"
                  placeholder="Ej. corrección de asistencia"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDaysModal} disabled={daysSaving}>
                Cancelar
              </Button>
              <Button type="button" onClick={submitDaysAdjust} disabled={daysSaving}>
                {daysSaving ? 'Guardando…' : 'Recalcular y guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

