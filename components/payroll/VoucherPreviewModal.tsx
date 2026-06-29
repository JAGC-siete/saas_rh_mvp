import React, { useEffect } from 'react'
import { formatCurrency } from '../../lib/utils/currency'
import type { VoucherPreviewData } from '../../lib/payroll/voucher-preview'
import { Button } from '../ui/button'
import { Icon } from '../Icon'

type VoucherPreviewModalProps = {
  open: boolean
  loading: boolean
  error: string | null
  data: VoucherPreviewData | null
  downloading?: boolean
  onClose: () => void
  onDownload: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-300 mb-2">{children}</h4>
  )
}

function AmountRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-2 border-b border-white/10 last:border-0 ${
        bold ? 'font-semibold text-white' : 'text-brand-100/90'
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'text-emerald-300' : ''}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  )
}

function PairGrid({ pairs }: { pairs: Array<{ label: string; value: string }> }) {
  if (!pairs.length) return null
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {pairs.map((pair) => (
        <div key={`${pair.label}-${pair.value}`}>
          <dt className="text-xs text-brand-300/80">{pair.label}</dt>
          <dd className="text-sm text-white mt-0.5">{pair.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function VoucherPreviewModal({
  open,
  loading,
  error,
  data,
  downloading = false,
  onClose,
  onDownload,
}: VoucherPreviewModalProps) {
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
      aria-labelledby="voucher-preview-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-brand-500/30 bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 px-6 py-5">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-500 to-sky-400" />
          {loading ? (
            <p className="text-white/80 text-sm">Cargando comprobante…</p>
          ) : data ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-200/90">
                Recibo de nómina
              </p>
              <h2 id="voucher-preview-title" className="mt-1 text-xl font-bold text-white">
                {data.companyName}
              </h2>
              <p className="mt-1 text-sm text-brand-100/90">{data.periodTitle}</p>
            </>
          ) : (
            <h2 id="voucher-preview-title" className="text-lg font-semibold text-white">
              Comprobante de pago
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
              {data.employee.length > 0 && (
                <section className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <SectionTitle>Información del empleado</SectionTitle>
                  <PairGrid pairs={data.employee} />
                </section>
              )}

              {data.earnings.length > 0 && (
                <section className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <SectionTitle>Detalle de ingresos</SectionTitle>
                  {data.earnings.map((line) => (
                    <AmountRow key={line.label} label={line.label} amount={line.amount} />
                  ))}
                </section>
              )}

              {data.deductions.length > 0 && (
                <section className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <SectionTitle>Detalle de deducciones</SectionTitle>
                  {data.deductions.map((line) => (
                    <AmountRow key={line.label} label={line.label} amount={line.amount} />
                  ))}
                  {data.totalDeductions != null && (
                    <AmountRow label="Total deducciones" amount={data.totalDeductions} bold />
                  )}
                </section>
              )}

              <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <SectionTitle>Resumen final</SectionTitle>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-emerald-100">Total a recibir</span>
                  <span className="text-2xl font-bold tabular-nums text-emerald-300">
                    {formatCurrency(data.netSalary)}
                  </span>
                </div>
              </section>

              {data.bank.length > 0 && (
                <section className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <SectionTitle>Información bancaria</SectionTitle>
                  <PairGrid pairs={data.bank} />
                  {data.transferAmount != null && (
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-sm text-brand-200/90">Monto a transferir</span>
                      <span className="text-sm font-semibold tabular-nums text-white">
                        {formatCurrency(data.transferAmount)}
                      </span>
                    </div>
                  )}
                </section>
              )}

              {data.showLegalNotes && (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-brand-200/70 space-y-1.5">
                  <SectionTitle>Notas</SectionTitle>
                  <p>• Este recibo es un documento oficial emitido por la empresa.</p>
                  <p>• Los montos están calculados según la legislación laboral de Honduras.</p>
                  <p>• ¿Preguntas? Contacte a su manager de recursos humanos.</p>
                </section>
              )}

              {data.showSignatures && (
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-brand-300/80 mb-2">Firma del empleado</p>
                    <div className="h-16 rounded-lg border border-dashed border-white/25 bg-white/[0.03]" />
                  </div>
                  <div>
                    <p className="text-xs text-brand-300/80 mb-2">Firma del autorizado</p>
                    <div className="h-16 rounded-lg border border-dashed border-white/25 bg-white/[0.03]" />
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-slate-900/80 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} className="border-white/20 text-white">
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={onDownload}
            disabled={loading || !!error || !data || downloading}
            className="bg-brand-600 hover:bg-brand-700"
          >
            <Icon name="download" className="h-4 w-4 mr-2" />
            {downloading ? 'Descargando…' : 'Descargar PDF'}
          </Button>
        </div>
      </div>
    </div>
  )
}
