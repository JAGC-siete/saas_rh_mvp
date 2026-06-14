import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupport } from '../../lib/hooks/useSupport'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicketRow,
  type TicketPriority,
  type TicketStatus,
} from '../../lib/support/schema'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import { XMarkIcon } from '@heroicons/react/24/outline'
import TicketThread from './TicketThread'

// Columns shown on the Kanban board (closed tickets are filtered out by default).
const BOARD_COLUMNS: TicketStatus[] = ['open', 'in_progress', 'waiting_customer', 'resolved']

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'text-gray-400',
  normal: 'text-gray-200',
  high: 'text-orange-300',
  urgent: 'text-red-400 font-semibold',
}

const COLUMN_ACCENT: Record<TicketStatus, string> = {
  open: 'border-t-blue-500/60',
  in_progress: 'border-t-amber-500/60',
  waiting_customer: 'border-t-purple-500/60',
  resolved: 'border-t-emerald-500/60',
  closed: 'border-t-gray-500/60',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-HN', { dateStyle: 'medium' })
  } catch {
    return iso
  }
}

export default function AgentConsole() {
  const { tickets, isLoading, error, fetchTickets } = useSupport()

  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [selected, setSelected] = useState<SupportTicketRow | null>(null)

  const reload = useCallback(() => {
    // Agents get every tenant's tickets from the list endpoint.
    fetchTickets({})
  }, [fetchTickets])

  useEffect(() => {
    reload()
  }, [reload])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (q && !t.subject.toLowerCase().includes(q)) return false
      return true
    })
  }, [tickets, priorityFilter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of tickets) c[t.status] = (c[t.status] || 0) + 1
    return c
  }, [tickets])

  const columns = showClosed ? [...BOARD_COLUMNS, 'closed' as TicketStatus] : BOARD_COLUMNS

  const handleTicketChange = useCallback((updated: SupportTicketRow) => {
    setSelected(updated)
    // Reflect status/priority moves on the board without a full refetch flicker.
    reload()
  }, [reload])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por asunto…"
            className="h-9 w-56"
          />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todas las prioridades</option>
            {(['urgent', 'high', 'normal', 'low'] as TicketPriority[]).map((p) => (
              <option key={p} value={p}>
                {TICKET_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Mostrar cerrados
          </label>
        </div>
        <Button size="sm" variant="ghost" onClick={reload}>
          Actualizar
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Kanban board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((status) => {
          const colTickets = filtered.filter((t) => t.status === status)
          return (
            <div
              key={status}
              className={cn(
                'rounded-lg border border-white/10 border-t-2 bg-white/5',
                COLUMN_ACCENT[status]
              )}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-sm font-semibold text-white">{TICKET_STATUS_LABELS[status]}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">
                  {counts[status] || 0}
                </span>
              </div>
              <div className="space-y-2 p-2 min-h-[120px]">
                {isLoading ? (
                  <p className="p-3 text-xs text-gray-400">Cargando…</p>
                ) : colTickets.length === 0 ? (
                  <p className="p-3 text-xs text-gray-500">Sin tickets</p>
                ) : (
                  colTickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="w-full rounded-md border border-white/10 bg-black/20 p-3 text-left hover:border-brand-500/40 hover:bg-white/5 transition-colors"
                    >
                      <p className="truncate text-sm font-medium text-white">{t.subject}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                        <span>{TICKET_CATEGORY_LABELS[t.category]}</span>
                        <span className={PRIORITY_STYLES[t.priority]}>{TICKET_PRIORITY_LABELS[t.priority]}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-[11px] text-gray-500">{formatDate(t.created_at)}</p>
                        {t.sla_breached && (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                            SLA vencido
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSelected(null)}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-app p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Ticket de soporte</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Cerrar">
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>
            <TicketThread ticket={selected} isAgent onTicketChange={handleTicketChange} />
          </div>
        </div>
      )}
    </div>
  )
}
