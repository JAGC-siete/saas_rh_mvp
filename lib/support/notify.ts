import { createAdminClient } from '../supabase/server'
import { logger } from '../logger'
import { getResendContactEmail } from '../resend-from'
import type { SupportTicketRow } from './schema'
import {
  emailTicketCreatedToAgent,
  emailTicketCreatedToCustomer,
  emailTicketEscalation,
  emailTicketReply,
  emailTicketStatus,
} from '../emails/support-ticket'

type NotificationType = 'info' | 'success' | 'warning' | 'error'

/** Support inbox that receives agent-facing alerts. */
export function getSupportInboxEmail(): string {
  return process.env.SUPPORT_INBOX_EMAIL?.trim() || getResendContactEmail()
}

/** Resolves the email for an auth user id. Returns null on failure. */
export async function resolveUserEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error) {
      logger.warn('support: failed to resolve user email', { userId, error: error.message })
      return null
    }
    return data.user?.email ?? null
  } catch (error) {
    logger.error('support: error resolving user email', error)
    return null
  }
}

/**
 * Inserts an in-app notification for support events. Best-effort: failures are
 * logged but never block the API response.
 */
async function insertNotification(params: {
  companyId: string
  employeeId: string | null
  type: NotificationType
  title: string
  message: string
  metadata: Record<string, unknown>
}) {
  try {
    const admin = createAdminClient()
    await admin.from('app_notifications').insert({
      company_id: params.companyId,
      employee_id: params.employeeId,
      module: 'support',
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata,
    })
  } catch (error) {
    logger.error('support: failed to insert notification', error)
  }
}

export async function notifyTicketCreated(ticket: SupportTicketRow) {
  // In-app: company-scoped notification so admins/managers see new tickets.
  await insertNotification({
    companyId: ticket.company_id,
    employeeId: null,
    type: 'warning',
    title: 'Nuevo ticket de soporte',
    message: ticket.subject,
    metadata: {
      ticket_id: ticket.id,
      category: ticket.category,
      priority: ticket.priority,
      module: ticket.module,
    },
  })

  // Email: confirmation to the customer + alert to the support inbox.
  const [creatorEmail] = await Promise.all([resolveUserEmail(ticket.created_by)])
  await Promise.all([
    creatorEmail ? emailTicketCreatedToCustomer(ticket, creatorEmail) : Promise.resolve(),
    emailTicketCreatedToAgent(ticket, getSupportInboxEmail()),
  ])
}

export async function notifyTicketReply(params: { ticket: SupportTicketRow; fromAgent: boolean; body?: string }) {
  const { ticket, fromAgent, body = '' } = params

  if (fromAgent) {
    // Notify the customer who opened the ticket (in-app + email).
    await insertNotification({
      companyId: ticket.company_id,
      employeeId: ticket.employee_id,
      type: 'info',
      title: 'Respuesta de soporte',
      message: ticket.subject,
      metadata: { ticket_id: ticket.id },
    })
    const creatorEmail = await resolveUserEmail(ticket.created_by)
    if (creatorEmail) {
      await emailTicketReply({ ticket, to: creatorEmail, fromAgent: true, body })
    }
  } else {
    // Notify company managers (in-app) and the support inbox (email).
    await insertNotification({
      companyId: ticket.company_id,
      employeeId: null,
      type: 'info',
      title: 'Nueva respuesta en ticket',
      message: ticket.subject,
      metadata: { ticket_id: ticket.id },
    })
    await emailTicketReply({ ticket, to: getSupportInboxEmail(), fromAgent: false, body })
  }
}

export async function notifyTicketStatusChange(params: { ticket: SupportTicketRow; newStatus: string }) {
  const { ticket, newStatus } = params
  await insertNotification({
    companyId: ticket.company_id,
    employeeId: ticket.employee_id,
    type: newStatus === 'resolved' || newStatus === 'closed' ? 'success' : 'info',
    title: 'Estado del ticket actualizado',
    message: ticket.subject,
    metadata: { ticket_id: ticket.id, status: newStatus },
  })

  const creatorEmail = await resolveUserEmail(ticket.created_by)
  if (creatorEmail) {
    await emailTicketStatus({ ticket, to: creatorEmail, newStatus })
  }
}

/** Used by the SLA cron to alert the support inbox about a breached ticket. */
export async function notifyTicketEscalated(ticket: SupportTicketRow) {
  await insertNotification({
    companyId: ticket.company_id,
    employeeId: null,
    type: 'warning',
    title: 'Ticket escalado por SLA',
    message: ticket.subject,
    metadata: { ticket_id: ticket.id, priority: ticket.priority },
  })
  await emailTicketEscalation(ticket, getSupportInboxEmail())
}
