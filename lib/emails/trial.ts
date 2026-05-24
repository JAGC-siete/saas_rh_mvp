import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'
import {
  escapeHtml,
  transactionalBulletList,
  transactionalCta,
  transactionalInfoBox,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'

export interface TrialStartedEmailData {
  to: string
  company_id: string
  trialEnd: string
}

export async function sendTrialStartedEmail(data: TrialStartedEmailData) {
  const config = await notificationManager.getConfigForCompany(data.company_id)
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const trialEndDate = new Date(data.trialEnd)
  const daysRemaining = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/app/dashboard`

  const bodyHtml = [
    transactionalParagraph(
      `Tu periodo de prueba ha comenzado. Tienes <strong style="color: #1a1a1a;">${daysRemaining} días</strong> para explorar la plataforma.`
    ),
    transactionalBulletList([
      'Gestión de empleados y departamentos',
      'Control de asistencia',
      'Generación y autorización de planillas',
      'Descarga de recibos en PDF',
    ]),
    transactionalInfoBox(
      `<strong>Expira:</strong> ${escapeHtml(trialEndDate.toLocaleDateString('es-HN'))}<br><br>El envío masivo de recibos por correo está incluido en planes de pago (Basic o superior).`,
      'neutral'
    ),
    transactionalCta(dashboardUrl, 'Ir al dashboard'),
  ].join('')

  const content = {
    to: data.to,
    subject: 'Tu trial de 30 días ha comenzado — Humano SISU',
    text: `Tu trial de Humano SISU ha comenzado. Expira el ${trialEndDate.toLocaleDateString('es-HN')}. Dashboard: ${dashboardUrl}`,
    html: wrapTransactionalEmail({
      title: 'Trial iniciado',
      subtitle: '30 días para evaluar Humano SISU',
      bodyHtml,
    }),
  }

  return await emailService.sendEmail(config, content)
}
