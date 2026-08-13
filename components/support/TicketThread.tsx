import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSupport } from '../../lib/hooks/useSupport'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicketRow,
  type TicketAttachmentRow,
  type TicketMessageRow,
  type TicketPriority,
  type TicketStatus,
} from '../../lib/support/schema'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/utils'
import { PaperClipIcon } from '@heroicons/react/24/outline'

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {TICKET_STATUS_LABELS[status]}
    </span>
  )
}

export interface TicketThreadProps {
  ticket: SupportTicketRow
  isAgent: boolean
  onTicketChange?: (ticket: SupportTicketRow) => void
}

export default function TicketThread({ ticket, isAgent, onTicketChange }: TicketThreadProps) {
  const { fetchMessages, postMessage, updateTicket, fetchAttachments, uploadAttachment } = useSupport()

  const [messages, setMessages] = useState<TicketMessageRow[]>([])
  const [attachments, setAttachments] = useState<TicketAttachmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLocalError(null)
    try {
      const [msgs, atts] = await Promise.all([fetchMessages(ticket.id), fetchAttachments(ticket.id)])
      setMessages(msgs)
      setAttachments(atts)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al cargar el ticket')
    } finally {
      setLoading(false)
    }
  }, [ticket.id, fetchMessages, fetchAttachments])

  useEffect(() => {
    load()
  }, [load])

  const handleReply = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!reply.trim() && !pendingFile) return
      setSending(true)
      setLocalError(null)
      try {
        let msg: TicketMessageRow | null = null
        if (reply.trim()) {
          msg = await postMessage(ticket.id, reply.trim(), isAgent && isInternal)
          setMessages((prev) => [...prev, msg as TicketMessageRow])
        }
        if (pendingFile) {
          const att = await uploadAttachment(ticket.id, pendingFile, msg?.id)
          setAttachments((prev) => [...prev, att])
        }
        setReply('')
        setIsInternal(false)
        setPendingFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Error al enviar')
      } finally {
        setSending(false)
      }
    },
    [reply, pendingFile, ticket.id, isAgent, isInternal, postMessage, uploadAttachment]
  )

  const handleStatus = useCallback(
    async (status: TicketStatus) => {
      setLocalError(null)
      try {
        const updated = await updateTicket(ticket.id, { status })
        onTicketChange?.(updated)
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Error al actualizar el estado')
      }
    },
    [ticket.id, updateTicket, onTicketChange]
  )

  const handlePriority = useCallback(
    async (priority: TicketPriority) => {
      setLocalError(null)
      try {
        const updated = await updateTicket(ticket.id, { priority })
        onTicketChange?.(updated)
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Error al actualizar la prioridad')
      }
    },
    [ticket.id, updateTicket, onTicketChange]
  )

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{ticket.subject}</h3>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
          <span className={PRIORITY_STYLES[ticket.priority]}>
            Prioridad: {TICKET_PRIORITY_LABELS[ticket.priority]}
          </span>
          {ticket.module && <span>Módulo: {ticket.module}</span>}
          <span>Creado: {formatDate(ticket.created_at)}</span>
          {ticket.metadata?.origin_url ? (
            <span className="truncate max-w-xs">Origen: {String(ticket.metadata.origin_url)}</span>
          ) : null}
        </div>
      </div>

      {/* Status / priority controls */}
      <div className="flex flex-wrap gap-2">
        {isAgent ? (
          <>
            {(['in_progress', 'waiting_customer', 'resolved', 'closed'] as TicketStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={ticket.status === s ? 'default' : 'outline'}
                onClick={() => handleStatus(s)}
              >
                {TICKET_STATUS_LABELS[s]}
              </Button>
            ))}
            <span className="mx-1 h-8 w-px bg-white/10" aria-hidden />
            {(['low', 'normal', 'high', 'urgent'] as TicketPriority[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={ticket.priority === p ? 'secondary' : 'ghost'}
                onClick={() => handlePriority(p)}
              >
                {TICKET_PRIORITY_LABELS[p]}
              </Button>
            ))}
          </>
        ) : (
          <>
            {ticket.status !== 'closed' && (
              <Button size="sm" variant="outline" onClick={() => handleStatus('closed')}>
                Cerrar ticket
              </Button>
            )}
            {(ticket.status === 'closed' || ticket.status === 'resolved') && (
              <Button size="sm" variant="outline" onClick={() => handleStatus('open')}>
                Reabrir
              </Button>
            )}
          </>
        )}
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-gray-400">Cargando hilo…</p>
        ) : (
          messages.map((m) => {
            const fromAgent = AGENT_ROLES.includes((m.author_role || '').toLowerCase())
            const msgAttachments = attachments.filter((a) => a.message_id === m.id)
            return (
              <div
                key={m.id}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  m.is_internal
                    ? 'border-yellow-500/30 bg-yellow-500/10'
                    : fromAgent
                      ? 'border-brand-500/30 bg-brand-500/10'
                      : 'border-white/10 bg-white/5'
                )}
              >
                <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {m.is_internal ? 'Nota interna · ' : ''}
                    {fromAgent ? 'Soporte' : 'Cliente'}
                  </span>
                  <span>{formatDate(m.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-gray-100">{m.body}</p>
                {msgAttachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msgAttachments.map((a) => (
                      <a
                        key={a.id}
                        href={a.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-brand-300 hover:bg-white/10"
                      >
                        <PaperClipIcon className="h-3.5 w-3.5" />
                        {a.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Standalone attachments (not tied to a message) */}
      {(() => {
        const orphan = attachments.filter((a) => !a.message_id)
        if (orphan.length === 0) return null
        return (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-xs font-medium text-gray-300">Adjuntos</p>
            <div className="flex flex-wrap gap-2">
              {orphan.map((a) => (
                <a
                  key={a.id}
                  href={a.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-brand-300 hover:bg-white/10"
                >
                  <PaperClipIcon className="h-3.5 w-3.5" />
                  {a.file_name}
                </a>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Reply box */}
      {ticket.status !== 'closed' && (
        <form onSubmit={handleReply} className="space-y-2 border-t border-white/10 pt-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Escribe una respuesta…"
            rows={3}
          />
          {pendingFile && (
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <PaperClipIcon className="h-4 w-4" />
              <span className="truncate">{pendingFile.name}</span>
              <button
                type="button"
                className="text-red-400 hover:text-red-300"
                onClick={() => {
                  setPendingFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                Quitar
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                className="hidden"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                <PaperClipIcon className="mr-1 h-4 w-4" /> Adjuntar
              </Button>
              {isAgent && (
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Nota interna
                </label>
              )}
            </div>
            <Button type="submit" size="sm" disabled={sending || (!reply.trim() && !pendingFile)}>
              {sending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </form>
      )}
      {localError && <p className="text-sm text-red-400">{localError}</p>}
    </div>
  )
}
