import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'
import { LIQUID } from '../brand/liquid-tokens'
import {
  transactionalCta,
  transactionalInfoBox,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'

export interface AffiliateWelcomeEmailData {
  to: string
  email: string
  referralCode: string
  loginUrl: string
}

/**
 * Correo de bienvenida sin contraseña: el afiliado define clave vía invitación Supabase.
 */
export async function sendAffiliateWelcomeEmail(data: AffiliateWelcomeEmailData) {
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const bodyHtml = [
    transactionalParagraph('Tu solicitud de afiliación ha sido aprobada. Ya formás parte del programa de Humano SISU.'),
    transactionalInfoBox(
      'Recibirás un <strong>correo aparte</strong> con un enlace seguro para crear tu contraseña. Revisá spam o promociones si no lo ves en la bandeja principal.',
      'neutral'
    ),
    transactionalInfoBox(
      `<strong>Tu código de referido</strong><br><span style="font-size: 24px; font-weight: 700; letter-spacing: 2px; font-family: monospace; color: ${LIQUID.textAccent};">${data.referralCode}</span>`,
      'neutral'
    ),
    transactionalCta(data.loginUrl, 'Ir al inicio de sesión'),
  ].join('')

  const content = {
    to: data.to,
    subject: 'Bienvenido al Programa de Afiliados — Humano SISU',
    text: `Tu solicitud fue aprobada. Código de referido: ${data.referralCode}. Login: ${data.loginUrl}`,
    html: wrapTransactionalEmail({
      title: 'Programa de Afiliados',
      subtitle: 'Solicitud aprobada',
      bodyHtml,
    }),
  }

  return await emailService.sendEmail(config, content)
}
