import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../../../lib/security/rate-limiting'
import {
  assertSupportPayloadSize,
  createMessageSchema,
  type SupportTicketRow,
  type TicketMessageRow,
} from '../../../../../lib/support/schema'
import { notifyTicketReply } from '../../../../../lib/support/notify'

const AGENT_ROLES = ['super_admin']
const COMPANY_MANAGER_ROLES = ['company_admin', 'hr_manager']

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const isAgent = AGENT_ROLES.includes(auth.role)
    const isManager = COMPANY_MANAGER_ROLES.includes(auth.role)
    const supabase = createAdminClient()

    const ticketId = typeof req.query.id === 'string' ? req.query.id : null
    if (!ticketId) return res.status(400).json({ error: 'Ticket ID requerido' })

    const { data: ticketData, error: fetchError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!ticketData) return res.status(404).json({ error: 'Ticket no encontrado' })

    const ticket = ticketData as SupportTicketRow
    const isOwner = ticket.created_by === auth.user.id
    const sameCompany = !!auth.companyId && ticket.company_id === auth.companyId
    const canAccess = isAgent || isOwner || (isManager && sameCompany)

    if (!canAccess) {
      return res.status(403).json({ error: 'No tiene permiso para este ticket' })
    }

    if (req.method === 'GET') {
      let query = supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      // Only agents can see internal notes.
      if (!isAgent) query = query.eq('is_internal', false)

      const { data, error } = await query
      if (error) throw error
      return res.status(200).json({ messages: (data ?? []) as TicketMessageRow[] })
    }

    if (req.method === 'POST') {
      assertSupportPayloadSize(req.body)
      const input = createMessageSchema.parse(req.body)

      // Only agents may post internal notes.
      const isInternal = isAgent ? input.is_internal : false

      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          company_id: ticket.company_id,
          author_id: auth.user.id,
          author_role: auth.role,
          body: input.body,
          is_internal: isInternal,
        })
        .select('*')
        .single()

      if (error) throw error

      // Lifecycle side-effects (skip for internal notes).
      if (!isInternal) {
        const patch: Record<string, unknown> = {}

        if (isAgent) {
          if (!ticket.first_response_at) patch.first_response_at = new Date().toISOString()
          // Agent reply moves an open ticket into progress.
          if (ticket.status === 'open') patch.status = 'in_progress'
        } else if (ticket.status === 'waiting_customer') {
          // Customer answered → back to in_progress for the agent.
          patch.status = 'in_progress'
        }

        if (Object.keys(patch).length > 0) {
          await supabase.from('support_tickets').update(patch).eq('id', ticketId)
        }

        await notifyTicketReply({ ticket, fromAgent: isAgent, body: input.body })
      }

      return res.status(201).json({ message: data as TicketMessageRow })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.issues.map((i) => i.message),
      })
    }
    if (error?.message === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({ error: 'Payload demasiado grande' })
    }
    if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error?.message)) return
    console.error('support/tickets/[id]/messages API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'POST'])(handler)
