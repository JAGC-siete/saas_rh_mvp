import { emailService, type EmailContent } from '../email-service'
import { notificationManager } from '../notification-providers'
import {
  escapeHtml,
  transactionalCta,
  transactionalInfoBox,
  transactionalKeyValueTable,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicketRow,
} from '../support/schema'
import { logger } from '../logger'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')

function customerTicketUrl(): string {
  return `${SITE_URL}/app/support`
}

function agentTicketUrl(): string {
  return `${SITE_URL}/app/admin/support`
}

function shortId(id: string): string {
  return id.slice(0, 8)
}

/** Best-effort send. Never throws; logs failures. */
async function safeSend(content: EmailContent): Promise<void> {
  try {
    const config = await notificationManager.getConfigForCompany('default')
    if (!config) {
      logger.warn('support email: no notification config available')
      return
    }
    const result = await emailService.sendEmail(config, content)
    if (!result.success) {
      logger.warn('support email: delivery failed', { error: result.error, to: content.to })
    }
  } catch (error) {
    logger.error('support email: unexpected error', error)
  }
}

function ticketDetailsTable(ticket: SupportTicketRow) {
  return transactionalKeyValueTable([
    { label: 'Ticket', value: `#${shortId(ticket.id)}` },
    { label: 'Categoría', value: TICKET_CATEGORY_LABELS[ticket.category] },
    { label: 'Prioridad', value: TICKET_PRIORITY_LABELS[ticket.priority] },
    { label: 'Estado', value: TICKET_STATUS_LABELS[ticket.status] },
  ])
}

/** Confirmation to the customer who opened the ticket. */
export async function emailTicketCreatedToCustomer(ticket: SupportTicketRow, to: string) {
  if (!to) return
  const bodyHtml = [
    transactionalParagraph('Hemos recibido tu solicitud de soporte. Nuestro equipo la revisará en breve.'),
    ticketDetailsTable(ticket),
    transactionalParagraph(`<strong>Asunto:</strong> ${escapeHtml(ticket.subject)}`),
    transactionalCta(customerTicketUrl(), 'Ver mi ticket'),
  ].join('')

  await safeSend({
    to,
    subject: `Ticket recibido #${shortId(ticket.id)} — ${ticket.subject}`,
    text: `Hemos recibido tu ticket "${ticket.subject}" (#${shortId(ticket.id)}). Puedes seguirlo en ${customerTicketUrl()}`,
    html: wrapTransactionalEmail({ title: 'Ticket recibido', subtitle: ticket.subject, bodyHtml }),
  })
}

/** Alert to the support inbox that a new ticket arrived. */
export async function emailTicketCreatedToAgent(ticket: SupportTicketRow, to: string) {
  if (!to) return
  const bodyHtml = [
    transactionalParagraph('Se ha creado un nuevo ticket de soporte.'),
    ticketDetailsTable(ticket),
    transactionalParagraph(`<strong>Asunto:</strong> ${escapeHtml(ticket.subject)}`),
    transactionalParagraph(escapeHtml(ticket.description).slice(0, 600)),
    transactionalCta(agentTicketUrl(), 'Abrir en la consola'),
  ].join('')

  await safeSend({
    to,
    subject: `[Soporte] Nuevo ticket ${TICKET_PRIORITY_LABELS[ticket.priority]} #${shortId(ticket.id)}`,
    text: `Nuevo ticket #${shortId(ticket.id)}: ${ticket.subject}. Consola: ${agentTicketUrl()}`,
    html: wrapTransactionalEmail({ title: 'Nuevo ticket de soporte', subtitle: ticket.subject, bodyHtml }),
  })
}

/** New reply notification (to customer or to support inbox). */
export async function emailTicketReply(params: {
  ticket: SupportTicketRow
  to: string
  fromAgent: boolean
  body: string
}) {
  const { ticket, to, fromAgent, body } = params
  if (!to) return

  const url = fromAgent ? customerTicketUrl() : agentTicketUrl()
  const who = fromAgent ? 'Soporte' : 'El cliente'
  const bodyHtml = [
    transactionalParagraph(`${who} respondió en el ticket #${shortId(ticket.id)}.`),
    transactionalInfoBox(escapeHtml(body).slice(0, 800).replace(/\n/g, '<br>')),
    transactionalCta(url, fromAgent ? 'Ver respuesta' : 'Responder'),
  ].join('')

  await safeSend({
    to,
    subject: `Re: Ticket #${shortId(ticket.id)} — ${ticket.subject}`,
    text: `${who} respondió en el ticket #${shortId(ticket.id)}: ${body.slice(0, 300)}`,
    html: wrapTransactionalEmail({ title: 'Nueva respuesta', subtitle: ticket.subject, bodyHtml }),
  })
}

/** Status change notification to the customer. */
export async function emailTicketStatus(params: {
  ticket: SupportTicketRow
  to: string
  newStatus: string
}) {
  const { ticket, to, newStatus } = params
  if (!to) return
  const statusLabel = TICKET_STATUS_LABELS[newStatus as keyof typeof TICKET_STATUS_LABELS] || newStatus

  const bodyHtml = [
    transactionalParagraph(`El estado de tu ticket #${shortId(ticket.id)} cambió a <strong>${escapeHtml(statusLabel)}</strong>.`),
    ticketDetailsTable({ ...ticket, status: newStatus as SupportTicketRow['status'] }),
    transactionalCta(customerTicketUrl(), 'Ver mi ticket'),
  ].join('')

  await safeSend({
    to,
    subject: `Ticket #${shortId(ticket.id)} — ${statusLabel}`,
    text: `Tu ticket #${shortId(ticket.id)} cambió a "${statusLabel}". Detalles: ${customerTicketUrl()}`,
    html: wrapTransactionalEmail({ title: 'Estado actualizado', subtitle: ticket.subject, bodyHtml }),
  })
}

/** SLA breach escalation alert to the support inbox. */
export async function emailTicketEscalation(ticket: SupportTicketRow, to: string) {
  if (!to) return
  const bodyHtml = [
    transactionalParagraph(
      `El ticket #${shortId(ticket.id)} superó el SLA de primera respuesta y fue escalado.`
    ),
    ticketDetailsTable(ticket),
    transactionalParagraph(`<strong>Asunto:</strong> ${escapeHtml(ticket.subject)}`),
    transactionalCta(agentTicketUrl(), 'Atender ahora'),
  ].join('')

  await safeSend({
    to,
    subject: `[SLA] Escalado #${shortId(ticket.id)} — ${ticket.subject}`,
    text: `SLA vencido en ticket #${shortId(ticket.id)}: ${ticket.subject}. Consola: ${agentTicketUrl()}`,
    html: wrapTransactionalEmail({ title: 'Ticket escalado por SLA', subtitle: ticket.subject, bodyHtml }),
  })
}
