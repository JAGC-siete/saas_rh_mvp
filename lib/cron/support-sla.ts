import { createAdminClient } from '../supabase/server'
import { logger } from '../logger'
import { escalatePriority } from '../support/sla'
import { notifyTicketEscalated } from '../support/notify'
import type { SupportTicketRow } from '../support/schema'

export interface SlaEscalationResult {
  scanned: number
  escalated: number
  errors: number
}

/**
 * Scans active tickets that are past their first-response SLA without a first
 * response, marks them as breached, bumps priority, and alerts the support
 * inbox. Idempotent: only processes tickets where sla_breached = false.
 */
export async function runSupportSlaEscalation(now: Date = new Date()): Promise<SlaEscalationResult> {
  const supabase = createAdminClient()
  const result: SlaEscalationResult = { scanned: 0, escalated: 0, errors: 0 }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .in('status', ['open', 'in_progress', 'waiting_customer'])
    .is('first_response_at', null)
    .eq('sla_breached', false)
    .not('sla_due_at', 'is', null)
    .lt('sla_due_at', now.toISOString())
    .limit(200)

  if (error) {
    logger.error('support SLA cron: query failed', error)
    throw error
  }

  const tickets = (data ?? []) as SupportTicketRow[]
  result.scanned = tickets.length

  for (const ticket of tickets) {
    try {
      const newPriority = escalatePriority(ticket.priority)
      const { data: updated, error: updateError } = await supabase
        .from('support_tickets')
        .update({
          sla_breached: true,
          escalated_at: now.toISOString(),
          priority: newPriority,
        })
        .eq('id', ticket.id)
        .eq('sla_breached', false) // guard against concurrent runs
        .select('*')
        .single()

      if (updateError) {
        result.errors += 1
        logger.warn('support SLA cron: update failed', { ticketId: ticket.id, error: updateError.message })
        continue
      }

      await notifyTicketEscalated(updated as SupportTicketRow)
      result.escalated += 1
    } catch (err) {
      result.errors += 1
      logger.error('support SLA cron: escalation error', err)
    }
  }

  logger.info('support SLA cron: completed', result)
  return result
}
