import React from 'react'
import { Card, CardContent } from '../ui/card'
import { formatCurrency } from '../../lib/utils/currency'
import type { JournalStatutoryTraceBlock } from '../../lib/accounting/payroll-statutory-trace'
import type { StatutoryDataSource } from '../../lib/tax/statutory-trace'
import { LinkIcon } from '@heroicons/react/24/outline'

const DATA_SOURCE_LABELS: Record<StatutoryDataSource, string> = {
  payroll_statutory_params: 'Parámetros legales (payroll_statutory_params)',
  tax_brackets: 'Tablas fiscales (tax_brackets)',
  fallback_default: 'Valores por defecto embebidos',
  none: 'Sin parámetros activos'
}

interface StatutoryTraceabilityPanelProps {
  statutory?: JournalStatutoryTraceBlock | null
  className?: string
}

export function StatutoryTraceabilityPanel({
  statutory,
  className
}: StatutoryTraceabilityPanelProps) {
  if (!statutory) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-white/60">
            Sin trazabilidad fiscal registrada. Regenere los asientos para vincular
            deducciones de ley con el origen de parámetros.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { trace, retention_totals, payroll_line_tax_year, pipeline } = statutory

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <LinkIcon className="h-5 w-5 text-brand-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-base font-medium text-white">Trazabilidad fiscal</h3>
            <p className="text-sm text-white/60 mt-0.5">
              Cadena: deducciones de ley en planilla → retenciones en asiento contable.
            </p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-white/50">País / año solicitado</dt>
            <dd className="text-white font-mono">
              {trace.countryCode} · {trace.requestedYear}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Año resuelto</dt>
            <dd className="text-white font-mono">
              {trace.resolvedYear ?? '—'}
              {trace.usedFallback ? (
                <span className="ml-2 text-amber-400 text-xs">(fallback)</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Origen de parámetros</dt>
            <dd className="text-white">
              {DATA_SOURCE_LABELS[trace.dataSource] ?? trace.dataSource}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Año en líneas de planilla</dt>
            <dd className="text-white font-mono">
              {payroll_line_tax_year ?? '—'}
            </dd>
          </div>
          {trace.sourceLabel ? (
            <div className="sm:col-span-2">
              <dt className="text-white/50">Fuente documentada</dt>
              <dd className="text-white">{trace.sourceLabel}</dd>
            </div>
          ) : null}
          {trace.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-white/50">Notas</dt>
              <dd className="text-white/80">{trace.notes}</dd>
            </div>
          ) : null}
        </dl>

        <div className="rounded-lg border border-white/15 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50 mb-2">
            Retenciones (desde planilla)
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-white">
            <span>IHSS: {formatCurrency(retention_totals.ihss)}</span>
            <span>RAP: {formatCurrency(retention_totals.rap)}</span>
            <span>ISR: {formatCurrency(retention_totals.isr)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-wide text-white/50 mb-2">
            Módulos en la cadena
          </p>
          <ul className="space-y-1 text-xs font-mono text-white/70">
            <li>1. {pipeline.deductions}</li>
            <li>2. {pipeline.employerContributions}</li>
            <li>3. {pipeline.laborProvisions}</li>
            <li>4. {pipeline.journal}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
