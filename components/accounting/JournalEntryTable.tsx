import React from 'react'
import { formatCurrency } from '../../lib/utils/currency'
import { cn } from '../../lib/utils'

export interface JournalLine {
  account_code?: string
  account_name?: string
  cost_center_type?: string | null
  debit_amount: number
  credit_amount: number
  description?: string | null
}

export interface JournalEntry {
  id: string
  entry_date: string
  description: string
  status: string
  currency?: string
  lines: JournalLine[]
}

interface JournalEntryTableProps {
  entries: JournalEntry[]
  className?: string
}

const COST_CENTER_LABELS: Record<string, string> = {
  ventas: 'Ventas',
  administracion: 'Administración',
  produccion: 'Producción'
}

function formatAmount(n: number): string {
  if (n <= 0) return ''
  return formatCurrency(n, { showSymbol: false })
}

export function JournalEntryTable({ entries, className }: JournalEntryTableProps) {
  let totalDebe = 0
  let totalHaber = 0

  for (const e of entries) {
    for (const l of e.lines) {
      totalDebe += Number(l.debit_amount) || 0
      totalHaber += Number(l.credit_amount) || 0
    }
  }

  const balanced = Math.abs(totalDebe - totalHaber) < 0.01

  return (
    <div className={cn('space-y-6', className)}>
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-white/20 overflow-hidden">
          <div className="bg-white/10 px-4 py-2 border-b border-white/20">
            <h3 className="font-medium text-white">{entry.description}</h3>
            <p className="text-sm text-white/60">
              {entry.entry_date} · {entry.status}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 bg-white/5">
                  <th className="text-left px-4 py-2 text-white/80 font-medium">Código</th>
                  <th className="text-left px-4 py-2 text-white/80 font-medium">Nombre</th>
                  <th className="text-left px-4 py-2 text-white/80 font-medium">Centro Costo</th>
                  <th className="text-right px-4 py-2 text-white/80 font-medium">Debe (L)</th>
                  <th className="text-right px-4 py-2 text-white/80 font-medium">Haber (L)</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <td className="px-4 py-2 text-white/90 font-mono">
                      {line.account_code ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-white/90">
                      {line.account_name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-white/70">
                      {line.cost_center_type
                        ? COST_CENTER_LABELS[line.cost_center_type] ?? line.cost_center_type
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-white/90 font-mono">
                      {formatAmount(line.debit_amount)}
                    </td>
                    <td className="px-4 py-2 text-right text-white/90 font-mono">
                      {formatAmount(line.credit_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {entries.length > 0 && (
        <div
          className={cn(
            'flex justify-end gap-8 px-4 py-3 rounded-lg border',
            balanced ? 'bg-white/5 border-white/20' : 'bg-red-500/20 border-red-500/40'
          )}
        >
          <span className="text-white/80">
            Total Debe: <strong className="text-white">{formatCurrency(totalDebe)}</strong>
          </span>
          <span className="text-white/80">
            Total Haber: <strong className="text-white">{formatCurrency(totalHaber)}</strong>
          </span>
          {!balanced && (
            <span className="text-red-400 font-medium">¡Descuadre detectado!</span>
          )}
        </div>
      )}
    </div>
  )
}
