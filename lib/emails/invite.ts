import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'
import {
  escapeHtml,
  transactionalEmphasis,
  transactionalBulletList,
  transactionalCta,
  transactionalInfoBox,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'

export interface InviteEmailData {
  to: string
  inviteUrl: string
  companyName: string
  role: string
}

export async function sendInviteEmail(data: InviteEmailData) {
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const roleDisplayNames = {
    employee: 'Empleado',
    manager: 'Gerente',
    hr_manager: 'Gerente de RRHH',
  }

  const roleLabel =
    roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role

  const bodyHtml = [
    transactionalParagraph(
      `Has sido invitado a unirte a ${transactionalEmphasis(escapeHtml(data.companyName))} como ${transactionalEmphasis(escapeHtml(roleLabel))}.`
    ),
    transactionalParagraph('Humano SISU centraliza empleados, asistencia y nómina para empresas en Honduras, El Salvador y Guatemala.'),
    transactionalBulletList([
      'Gestión completa de empleados',
      'Control de asistencia',
      'Generación automática de planillas',
      'Recibos de pago en PDF',
    ]),
    transactionalCta(data.inviteUrl, 'Aceptar invitación'),
    transactionalInfoBox(
      '<strong>Importante:</strong> este enlace expira en 7 días. Si no tienes cuenta, se creará al aceptar la invitación.',
      'warning'
    ),
  ].join('')

  const content = {
    to: data.to,
    subject: `Invitación a ${data.companyName} — Humano SISU`,
    text: `Has sido invitado a ${data.companyName} en Humano SISU como ${roleLabel}.\n\nAcepta aquí: ${data.inviteUrl}\n\nEl enlace expira en 7 días.`,
    html: wrapTransactionalEmail({
      title: 'Invitación al equipo',
      subtitle: data.companyName,
      bodyHtml,
    }),
  }

  return await emailService.sendEmail(config, content)
}
