import type { TicketPriority } from './schema'

/**
 * First-response SLA targets (in minutes) by priority. These define how long
 * support has to send the first reply before a ticket is considered breached
 * and escalated. Kept in code (not DB) for simplicity; override via env if
 * needed later.
 */
export const SLA_FIRST_RESPONSE_MINUTES: Record<TicketPriority, number> = {
  urgent: 60, // 1 hour
  high: 4 * 60, // 4 hours
  normal: 24 * 60, // 1 business day
  low: 72 * 60, // 3 days
}

/** Priority escalation ladder applied when a ticket breaches its SLA. */
const PRIORITY_ESCALATION: Record<TicketPriority, TicketPriority> = {
  low: 'normal',
  normal: 'high',
  high: 'urgent',
  urgent: 'urgent',
}

/** Returns the first-response due timestamp (ISO) given a creation time. */
export function computeSlaDueAt(priority: TicketPriority, fromIso?: string): string {
  const base = fromIso ? new Date(fromIso) : new Date()
  const minutes = SLA_FIRST_RESPONSE_MINUTES[priority] ?? SLA_FIRST_RESPONSE_MINUTES.normal
  return new Date(base.getTime() + minutes * 60_000).toISOString()
}

/** Next priority level when escalating a breached ticket. */
export function escalatePriority(priority: TicketPriority): TicketPriority {
  return PRIORITY_ESCALATION[priority] ?? priority
}
