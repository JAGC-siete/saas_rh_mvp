import React, { useEffect, useState } from 'react'
import { formatCurrency } from '../../lib/utils/currency'
import type { PlanillaPreviewData, PlanillaPreviewEmployeeRow } from '../../lib/payroll/planilla-preview'
import type { PayrollPdfGroupBy } from '../../lib/payroll/pdf-layout'
import { Button } from '../ui/button'
import { Icon } from '../Icon'

type PlanillaPreviewModalProps = {
  open: boolean
  loading: boolean
  error: string | null
  data: PlanillaPreviewData | null
  downloading?: boolean
  onClose: () => void
  onDownload: (groupBy: PayrollPdfGroupBy) => void | Promise<void>
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-white/15 bg-white/5'
      }`}
    >
      <p className="text-xs text-brand-300/80">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          highlight ? 'text-emerald-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function EmployeeTable({
  title,
  rows,
  dedLabels,
  showHours,
}: {
  title: string
  rows: PlanillaPreviewEmployeeRow[]
  dedLabels: PlanillaPreviewData['dedLabels']
  showHours?: boolean
}) {
  if (!rows.length) return null
  return (
    <section className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-gray-400">{rows.length} empleados</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 text-left text-brand-300/90">
              <th className="px-3 py-2 font-medium">Empleado</th>
              <th className="px-3 py-2 font-medium">Departamento</th>
              <th className="px-3 py-2 font-medium text-right">
                {showHours ? 'Horas' : 'Días'}
              </th>
              <th className="px-3 py-2 font-medium text-right">Bruto</th>
              <th className="px-3 py-2 font-medium text-right">{dedLabels.primarySocial}</th>
              <th className="px-3 py-2 font-medium text-right">{dedLabels.secondarySocial}</th>
              <th className="px-3 py-2 font-medium text-right">{dedLabels.incomeTax}</th>
              <th className="px-3 py-2 font-medium text-right">Neto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.name}`} className="border-b border-white/5 text-gray-200">
                <td className="px-3 py-2.5 font-medium text-white">{row.name}</td>
                <td className="px-3 py-2.5">{row.department}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {showHours
                    ? (row.hoursWorked ?? 0).toFixed(2)
                    : row.daysWorked.toFixed(1)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.gross)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.ihss)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.rap)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.isr)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-300">
                  {formatCurrency(row.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function PlanillaPreviewModal({
  open,
  loading,
  error,
  data,
  downloading = false,
  onClose,
  onDownload,
}: PlanillaPreviewModalProps) {
  const [pdfGroupBy, setPdfGroupBy] = useState<PayrollPdfGroupBy>('none')

  useEffect(() => {
    if (data?.defaultPdfGroupBy) {
      setPdfGroupBy(data.defaultPdfGroupBy as PayrollPdfGroupBy)
    }
  }, [data?.defaultPdfGroupBy, data?.runId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planilla-preview-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-brand-500/30 bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 px-6 py-5">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-500 to-sky-400" />
          {loading ? (
            <p className="text-white/80 text-sm">Cargando planilla…</p>
          ) : data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-200/90">
                  Planilla de nómina
                </p>
                {data.isDraftPreview ? (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                    Vista previa — no autorizada
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                    Autorizada
                  </span>
                )}
              </div>
              <h2 id="planilla-preview-title" className="mt-1 text-xl font-bold text-white">
                {data.companyName}
              </h2>
              <p className="mt-1 text-sm text-brand-100/90">
                {data.periodTitle} · {data.periodRange}
              </p>
            </>
          ) : (
            <h2 id="planilla-preview-title" className="text-lg font-semibold text-white">
              Vista previa de planilla
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand-400" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Empleados" value={String(data.summary.employees)} />
                <SummaryCard label="Total bruto" value={formatCurrency(data.summary.totalGross)} />
                <SummaryCard
                  label="Total deducciones"
                  value={formatCurrency(data.summary.totalDeductions)}
                />
                <SummaryCard
                  label="Total neto"
                  value={formatCurrency(data.summary.totalNet)}
                  highlight
                />
              </div>

              <EmployeeTable
                title="Empleados fijos"
                rows={data.fixedRows}
                dedLabels={data.dedLabels}
              />
              <EmployeeTable
                title="Empleados por hora"
                rows={data.hourlyRows}
                dedLabels={data.dedLabels}
                showHours
              />

              {data.isDraftPreview && (
                <p className="text-xs text-amber-200/80 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                  El PDF descargable incluirá la marca <strong>VISTA PREVIA — NO AUTORIZADA</strong>{' '}
                  hasta que la nómina sea autorizada.
                </p>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-900/80 px-6 py-4">
          <div className="flex items-center gap-2 min-w-[200px]">
            <label htmlFor="planilla-pdf-group-by" className="text-xs text-gray-300 whitespace-nowrap">
              Agrupar PDF:
            </label>
            <select
              id="planilla-pdf-group-by"
              value={pdfGroupBy}
              onChange={(e) => setPdfGroupBy(e.target.value as PayrollPdfGroupBy)}
              disabled={loading || !!error || !data || downloading}
              className="rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white"
            >
              <option value="none">Una sola tabla</option>
              <option value="department">Departamento</option>
              <option value="team">Equipo</option>
              <option value="position">Posición</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/20 text-white">
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => void onDownload(pdfGroupBy)}
              disabled={loading || !!error || !data || downloading}
              className="bg-brand-600 hover:bg-brand-700"
            >
              <Icon name="download" className="h-4 w-4 mr-2" />
              {downloading ? 'Descargando…' : 'Descargar PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
