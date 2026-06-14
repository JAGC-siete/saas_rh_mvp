import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../../../lib/security/rate-limiting'
import {
  assertSupportPayloadSize,
  updateTicketSchema,
  type SupportTicketRow,
} from '../../../../../lib/support/schema'
import { notifyTicketStatusChange } from '../../../../../lib/support/notify'

const AGENT_ROLES = ['super_admin']
const COMPANY_MANAGER_ROLES = ['company_admin', 'hr_manager']

// Fields a non-agent (owner/manager) is allowed to change.
const OWNER_ALLOWED_KEYS = new Set(['status'])

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const isAgent = AGENT_ROLES.includes(auth.role)
    const isManager = COMPANY_MANAGER_ROLES.includes(auth.role)
    const supabase = createAdminClient()

    const id = typeof req.query.id === 'string' ? req.query.id : null
    if (!id) return res.status(400).json({ error: 'Ticket ID requerido' })

    const { data: ticketData, error: fetchError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
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
      return res.status(200).json({ ticket })
    }

    if (req.method === 'PATCH') {
      assertSupportPayloadSize(req.body)
      const input = updateTicketSchema.parse(req.body)

      // Non-agents may only change status.
      if (!isAgent) {
        const requestedKeys = Object.keys(input)
        const forbidden = requestedKeys.filter((k) => !OWNER_ALLOWED_KEYS.has(k))
        if (forbidden.length > 0) {
          return res.status(403).json({ error: 'Solo soporte puede modificar esos campos' })
        }
      }

      const patch: Record<string, unknown> = {}
      if (input.status !== undefined) patch.status = input.status
      if (isAgent) {
        if (input.priority !== undefined) patch.priority = input.priority
        if (input.category !== undefined) patch.category = input.category
        if (input.assigned_to !== undefined) patch.assigned_to = input.assigned_to
        if (input.sla_due_at !== undefined) patch.sla_due_at = input.sla_due_at
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Nada para actualizar' })
      }

      const { data: updated, error: updateError } = await supabase
        .from('support_tickets')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()

      if (updateError) throw updateError

      const updatedTicket = updated as SupportTicketRow
      if (input.status !== undefined && input.status !== ticket.status) {
        await notifyTicketStatusChange({ ticket: updatedTicket, newStatus: input.status })
      }

      return res.status(200).json({ ticket: updatedTicket })
    }

    res.setHeader('Allow', ['GET', 'PATCH'])
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
    console.error('support/tickets/[id] API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'PATCH'])(handler)
