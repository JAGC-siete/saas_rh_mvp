import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../../lib/security/rate-limiting'
import {
  assertSupportPayloadSize,
  createTicketSchema,
  listTicketsQuerySchema,
  type SupportTicketRow,
} from '../../../../lib/support/schema'
import { notifyTicketCreated } from '../../../../lib/support/notify'
import { computeSlaDueAt } from '../../../../lib/support/sla'

const AGENT_ROLES = ['super_admin']
const COMPANY_MANAGER_ROLES = ['company_admin', 'hr_manager']

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    const isAgent = AGENT_ROLES.includes(auth.role)
    const isManager = COMPANY_MANAGER_ROLES.includes(auth.role)
    const supabase = createAdminClient()

    if (req.method === 'GET') {
      const q = listTicketsQuerySchema.parse(req.query)

      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false })

      if (isAgent) {
        // Support agent sees everything; optional company filter.
        if (q.company_id) query = query.eq('company_id', q.company_id)
      } else {
        // Scope to the user's company.
        if (!auth.companyId) {
          return res.status(400).json({ error: 'Company ID is required' })
        }
        query = query.eq('company_id', auth.companyId)

        // Managers can see all company tickets; everyone else only their own.
        if (!isManager || q.mine === 'true') {
          query = query.eq('created_by', auth.user.id)
        }
      }

      if (q.status) query = query.eq('status', q.status)
      if (q.category) query = query.eq('category', q.category)
      if (q.priority) query = query.eq('priority', q.priority)

      const { data, error } = await query
      if (error) throw error
      return res.status(200).json({ tickets: (data ?? []) as SupportTicketRow[] })
    }

    if (req.method === 'POST') {
      assertSupportPayloadSize(req.body)
      const input = createTicketSchema.parse(req.body)

      if (!auth.companyId) {
        return res.status(400).json({ error: 'Company ID is required' })
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          company_id: auth.companyId,
          created_by: auth.user.id,
          employee_id: auth.userProfile?.employee_id ?? null,
          subject: input.subject,
          description: input.description,
          category: input.category,
          priority: input.priority,
          module: input.module ?? null,
          status: 'open',
          sla_due_at: computeSlaDueAt(input.priority),
          metadata: input.metadata ?? {},
        })
        .select('*')
        .single()

      if (error) throw error

      const ticket = data as SupportTicketRow

      // Seed the conversation thread with the initial description.
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        company_id: ticket.company_id,
        author_id: auth.user.id,
        author_role: auth.role,
        body: input.description,
        is_internal: false,
      })

      await notifyTicketCreated(ticket)

      return res.status(201).json({ ticket })
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
    console.error('support/tickets API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'POST'])(handler)
