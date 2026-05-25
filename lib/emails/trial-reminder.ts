import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'
import {
  escapeHtml,
  transactionalBulletList,
  transactionalCta,
  transactionalInfoBox,
  transactionalKeyValueTable,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'

export interface TrialReminderEmailData {
  to: string
  companyName: string
  daysRemaining: number
  trialEnd: string
}

export async function sendTrialReminderEmail(data: TrialReminderEmailData) {
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const trialEndDate = new Date(data.trialEnd)
  const isUrgent = data.daysRemaining <= 3
  const settingsUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/app/settings`
  const expiryLabel =
    data.daysRemaining === 1
      ? 'expira mañana'
      : `expira en ${data.daysRemaining} días`

  const bodyHtml = [
    transactionalParagraph(
      isUrgent
        ? `<strong style="color: #b45309;">Atención:</strong> tu trial ${expiryLabel}.`
        : `Recordatorio: tu trial ${expiryLabel}.`
    ),
    transactionalKeyValueTable([
      { label: 'Empresa', value: data.companyName },
      { label: 'Fecha de expiración', value: trialEndDate.toLocaleDateString('es-HN') },
    ]),
    transactionalParagraph(
      'Para continuar con planillas, reportes y envío masivo de recibos por correo, activa un plan de pago.'
    ),
    transactionalBulletList([
      'Planillas y deducciones legales',
      'Reportes operativos',
      'Envío masivo de recibos por email',
      'Soporte de implementación',
    ]),
    transactionalInfoBox(
      '1. Ve a Configuración → Billing<br>2. Registra tu pago<br>3. Tu plan se activa de inmediato',
      'neutral'
    ),
    transactionalCta(settingsUrl, isUrgent ? 'Activar plan ahora' : 'Ver opciones de plan'),
  ].join('')

  const content = {
    to: data.to,
    subject: `${isUrgent ? 'Trial expira pronto' : 'Recordatorio de trial'} — ${data.companyName}`,
    text: `Tu trial de Humano SISU ${expiryLabel}. Empresa: ${data.companyName}. Expira: ${trialEndDate.toLocaleDateString('es-HN')}.`,
    html: wrapTransactionalEmail({
      title: isUrgent ? 'Tu trial expira pronto' : 'Recordatorio de trial',
      subtitle: data.companyName,
      bodyHtml,
    }),
  }

  return await emailService.sendEmail(config, content)
}
