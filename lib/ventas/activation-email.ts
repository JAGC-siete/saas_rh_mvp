import type { VentasBankDetails } from './bank-details'
import {
  buildBankDetailsInlineHtml,
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from './bank-details'
import { VENTAS_BRAND as B } from './brand-styles'
import {
  escapeHtml,
  liquidCta,
  liquidCtaWhatsApp,
  liquidEmphasis,
  liquidInfoBox,
  liquidKeyValueTable,
  liquidParagraph,
  liquidPanel,
  wrapLiquidEmail,
} from '../emails/liquid-layout'

function firstNameFromContact(contactName?: string): string {
  const trimmed = contactName?.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] || trimmed
}

export function generateVentasActivationEmailSubject(contactName?: string): string {
  const firstName = firstNameFromContact(contactName)
  if (firstName) return `Aquí tienes las llaves, ${firstName}.`
  return 'Aquí tienes las llaves.'
}

export function generateVentasActivationEmailHTML(params: {
  contactName?: string
  companyName?: string
  email: string
  password: string
  loginUrl: string
  bankDetails?: VentasBankDetails | null
}) {
  const firstName = firstNameFromContact(params.contactName)
  const greeting = firstName ? `Hola ${escapeHtml(firstName)},` : 'Hola,'

  const companyLabel = params.companyName?.trim()
    ? escapeHtml(params.companyName.trim())
    : 'tu empresa'

  const hasBankDetails = !!params.bankDetails
  const supportWhatsAppUrl = buildVentasSupportWhatsAppUrl(
    buildQuotationAcquisitionWhatsAppText({
      contactName: params.contactName,
      companyName: params.companyName,
      includeBankPrompt: hasBankDetails,
      context: 'activation',
    })
  )
  const bankBlock = params.bankDetails
    ? buildBankDetailsInlineHtml(params.bankDetails, params.contactName)
    : ''

  const credentialsTable = liquidKeyValueTable([
    { label: 'Email', value: params.email },
    { label: 'Contraseña', value: params.password },
  ])

  const bodyHtml = [
    liquidParagraph(greeting),
    liquidParagraph(
      `Hicimos el trabajo pesado por ti. Tu entorno de prueba para ${liquidEmphasis(companyLabel)} ya está 100% configurado y listo para usar.`
    ),
    liquidParagraph(
      'Nada de teoría. Usa los accesos de abajo para entrar al panel, revisar tus parámetros y ver exactamente cómo funciona Humano SISU.'
    ),
    liquidPanel(credentialsTable, 'Tus credenciales de acceso'),
    liquidCta(params.loginUrl, 'Entrar al panel ahora'),
    bankBlock,
    liquidCtaWhatsApp(supportWhatsAppUrl, '💬 Continuar contratación por WhatsApp'),
    liquidInfoBox(
      '<strong>Nota:</strong> Por tu propia seguridad, el sistema te pedirá cambiar la contraseña en cuanto entres. Te tomará 15 segundos.',
      'warning'
    ),
  ].join('')

  return wrapLiquidEmail({
    title: 'Tu entorno está listo',
    subtitle: 'Humano SISU — acceso configurado',
    badge: 'Activación',
    bodyHtml,
    footerNote: 'Humano SISU · Plataforma de Recursos Humanos',
  })
}
