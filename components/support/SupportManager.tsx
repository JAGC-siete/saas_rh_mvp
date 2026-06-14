import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/auth'
import { useSupport } from '../../lib/hooks/useSupport'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicketRow,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../../lib/support/schema'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/utils'
import TicketThread from './TicketThread'

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  in_progress: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  waiting_customer: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'text-gray-400',
  normal: 'text-gray-200',
  high: 'text-orange-300',
  urgent: 'text-red-400 font-semibold',
}

const AGENT_ROLES = ['super_admin']

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {TICKET_STATUS_LABELS[status]}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

type View = 'list' | 'new' | 'detail'

export default function SupportManager() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const role = (userProfile?.role || '').toLowerCase()
  const isAgent = AGENT_ROLES.includes(role)

  const { tickets, isLoading, isSubmitting, error, fetchTickets, createTicket } = useSupport()

  const [view, setView] = useState<View>('list')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [activeTicket, setActiveTicket] = useState<SupportTicketRow | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  // New ticket form state
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('other')
  const [priority, setPriority] = useState<TicketPriority>('normal')

  const reload = useCallback(() => {
    fetchTickets(statusFilter === 'all' ? {} : { status: statusFilter })
  }, [fetchTickets, statusFilter])

  useEffect(() => {
    reload()
  }, [reload])

  // Deep link: ?view=new (from the floating help button)
  useEffect(() => {
    if (!router.isReady) return
    if (typeof router.query.view === 'string' && router.query.view === 'new') {
      setView('new')
    }
  }, [router.isReady, router.query.view])

  const openDetail = useCallback((ticket: SupportTicketRow) => {
    setActiveTicket(ticket)
    setView('detail')
  }, [])

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLocalError(null)
      try {
        const moduleFromQuery = typeof router.query.module === 'string' ? router.query.module : null
        const originUrl = typeof router.query.from === 'string' ? router.query.from : null
        const created = await createTicket({
          subject,
          description,
          category,
          priority,
          module: moduleFromQuery,
          metadata: originUrl ? { origin_url: originUrl } : undefined,
        })
        setSubject('')
        setDescription('')
        setCategory('other')
        setPriority('normal')
        if (created) openDetail(created)
        else setView('list')
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Error al crear el ticket')
      }
    },
    [subject, description, category, priority, router.query, createTicket, openDetail]
  )

  // ----- New ticket form -----
  if (view === 'new') {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Nuevo ticket de soporte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Asunto</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Resumen del problema"
                required
                minLength={3}
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Prioridad</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Descripción</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema con el mayor detalle posible"
                required
                minLength={5}
                maxLength={5000}
                rows={6}
              />
            </div>
            {(localError || error) && <p className="text-sm text-red-400">{localError || error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando…' : 'Crear ticket'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setView('list')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  // ----- Detail / thread -----
  if (view === 'detail' && activeTicket) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setView('list')
            reload()
          }}
        >
          ← Volver al listado
        </Button>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="pt-6">
            <TicketThread ticket={activeTicket} isAgent={isAgent} onTicketChange={setActiveTicket} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ----- List -----
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'ghost'}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Todos' : TICKET_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
        <Button onClick={() => setView('new')}>Nuevo ticket</Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Cargando tickets…</p>
          ) : tickets.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">No hay tickets para mostrar.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openDetail(t)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{t.subject}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {TICKET_CATEGORY_LABELS[t.category]} · {formatDate(t.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn('text-xs', PRIORITY_STYLES[t.priority])}>
                      {TICKET_PRIORITY_LABELS[t.priority]}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
