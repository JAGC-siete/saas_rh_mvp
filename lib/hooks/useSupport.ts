import { useCallback, useState } from 'react'
import { logger } from '../logger'
import type {
  SupportTicketRow,
  TicketAttachmentRow,
  TicketCategory,
  TicketMessageRow,
  TicketPriority,
  TicketStatus,
} from '../support/schema'

function apiErrorMessage(data: { message?: string; error?: string } | null, fallback: string): string {
  if (!data) return fallback
  const m = data.message || data.error
  return typeof m === 'string' && m.trim() ? m.trim() : fallback
}

export interface CreateTicketInput {
  subject: string
  description: string
  category?: TicketCategory
  priority?: TicketPriority
  module?: string | null
  metadata?: Record<string, unknown>
}

export interface TicketListFilters {
  status?: TicketStatus
  category?: TicketCategory
  priority?: TicketPriority
  mine?: boolean
  company_id?: string
}

export function useSupport() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = useCallback(async (filters: TicketListFilters = {}) => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.category) params.set('category', filters.category)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.mine) params.set('mine', 'true')
      if (filters.company_id) params.set('company_id', filters.company_id)

      const qs = params.toString()
      const res = await fetch(`/api/support/tickets${qs ? `?${qs}` : ''}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al cargar tickets'))
      }
      const { tickets: rows } = await res.json()
      setTickets(rows || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar tickets'
      setError(msg)
      logger.error('useSupport.fetchTickets', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createTicket = useCallback(async (input: CreateTicketInput): Promise<SupportTicketRow | null> => {
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al crear ticket'))
      }
      const { ticket } = await res.json()
      setTickets((prev) => [ticket, ...prev])
      return ticket as SupportTicketRow
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear ticket'
      setError(msg)
      logger.error('useSupport.createTicket', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const fetchMessages = useCallback(async (ticketId: string): Promise<TicketMessageRow[]> => {
    const res = await fetch(`/api/support/tickets/${ticketId}/messages`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(apiErrorMessage(data, 'Error al cargar mensajes'))
    }
    const { messages } = await res.json()
    return (messages || []) as TicketMessageRow[]
  }, [])

  const postMessage = useCallback(
    async (ticketId: string, body: string, isInternal = false): Promise<TicketMessageRow> => {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, is_internal: isInternal }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al enviar mensaje'))
      }
      const { message } = await res.json()
      return message as TicketMessageRow
    },
    []
  )

  const updateTicket = useCallback(
    async (ticketId: string, patch: Partial<Pick<SupportTicketRow, 'status' | 'priority' | 'category' | 'assigned_to'>>): Promise<SupportTicketRow> => {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al actualizar ticket'))
      }
      const { ticket } = await res.json()
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)))
      return ticket as SupportTicketRow
    },
    []
  )

  const fetchAttachments = useCallback(async (ticketId: string): Promise<TicketAttachmentRow[]> => {
    const res = await fetch(`/api/support/tickets/${ticketId}/attachments`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(apiErrorMessage(data, 'Error al cargar adjuntos'))
    }
    const { attachments } = await res.json()
    return (attachments || []) as TicketAttachmentRow[]
  }, [])

  const uploadAttachment = useCallback(
    async (ticketId: string, file: File, messageId?: string): Promise<TicketAttachmentRow> => {
      const formData = new FormData()
      formData.append('file', file)
      if (messageId) formData.append('message_id', messageId)
      const res = await fetch(`/api/support/tickets/${ticketId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al subir el archivo'))
      }
      const { attachment } = await res.json()
      return attachment as TicketAttachmentRow
    },
    []
  )

  return {
    tickets,
    isLoading,
    isSubmitting,
    error,
    fetchTickets,
    createTicket,
    fetchMessages,
    postMessage,
    updateTicket,
    fetchAttachments,
    uploadAttachment,
  }
}
