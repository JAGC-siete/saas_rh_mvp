import type { LeadRegistroNotificationData, LeadRegistroSource } from './registro-notification'
import { VENTAS_BRAND as B } from '../ventas/brand-styles'
import {
  escapeHtml,
  liquidCtaWhatsApp,
  liquidInfoBox,
  liquidPanel,
  wrapLiquidEmail,
} from '../emails/liquid-layout'

const SOURCE_LABELS: Record<
  LeadRegistroSource,
  { title: string; subtitle: string; badge: string }
> = {
  activar: {
    title: 'Nuevo Registro en SISU',
    subtitle: 'Trial activado desde /activar',
    badge: 'Activación',
  },
  ventas: {
    title: 'Nueva Cotización en SISU',
    subtitle: 'Lead completó el formulario en /ventas',
    badge: 'Cotización',
  },
  suscripcion: {
    title: 'Nueva Suscripción en SISU',
    subtitle: 'Lead se suscribió desde /suscripcion',
    badge: 'Newsletter',
  },
  info: {
    title: 'Nueva Solicitud de Información en SISU',
    subtitle: 'Lead solicitó más información desde /secreto',
    badge: 'Más información',
  },
  viernes: {
    title: 'Nuevo lead /viernes en SISU',
    subtitle: 'Lead pidió claves para recuperar el viernes',
    badge: 'Viernes',
  },
}

function sourcePath(source: LeadRegistroSource): string {
  return source === 'suscripcion' ? '/suscripcion' : `/${source}`
}

function infoRow(label: string, value: string, valueIsLink = false): string {
  const valueHtml = valueIsLink
    ? `<a href="mailto:${escapeHtml(value)}" style="color: ${B.emailAccent}; text-decoration: none;">${escapeHtml(value)}</a>`
    : escapeHtml(value)

  return `
    <tr>
      <td style="padding: 8px 0; color: ${B.emailTextMuted}; font-size: 13px; vertical-align: top; width: 38%;">${label}</td>
      <td style="padding: 8px 0; color: ${B.emailText}; font-size: 14px; vertical-align: top; font-weight: 500;">${valueHtml}</td>
    </tr>
  `
}

function buildExtraRows(data: LeadRegistroNotificationData): string {
  const rows: string[] = []

  if (data.whatsapp) rows.push(infoRow('📱 WhatsApp', data.whatsapp))
  if (data.empleados != null) rows.push(infoRow('👥 Empleados', String(data.empleados)))
  if (data.country_code) rows.push(infoRow('🌎 País (nómina)', data.country_code))
  if (data.tenant_id) rows.push(infoRow('🆔 Tenant ID', data.tenant_id))
  if (data.quote_id) rows.push(infoRow('📄 Cotización ID', data.quote_id))
  if (data.billing_modality) rows.push(infoRow('💳 Modalidad', data.billing_modality))
  if (data.monthly_total != null && data.currency) {
    rows.push(infoRow('💰 Total mensual', `${data.currency} ${data.monthly_total}`))
  }

  rows.push(infoRow('📍 Fuente', sourcePath(data.source)))
  return rows.join('')
}

export function buildLeadRegistroNotificationHtml(
  data: LeadRegistroNotificationData,
  whatsappContactUrl: string | null
): string {
  const labels = SOURCE_LABELS[data.source]
  const empresa = data.empresa?.trim() || 'No especificada'

  const contactTable = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      ${infoRow('👤 Nombre', data.nombre)}
      ${infoRow('🏢 Empresa', empresa)}
      ${infoRow('📧 Email', data.email, true)}
      ${buildExtraRows(data)}
    </table>
  `

  const vcardNote = liquidInfoBox(
    `<p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">📎 Archivo vCard adjunto</p>
    <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.55;">Se ha adjuntado un archivo de contacto (.vcf) que puedes importar a tu libreta de contactos.</p>
    <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>iPhone:</strong> Abre el adjunto y toca &quot;Agregar a contactos&quot;.</p>
    <p style="margin: 0; font-size: 13px;"><strong>Android:</strong> Descarga el archivo y ábrelo con Contactos.</p>`,
    'neutral'
  )

  const whatsappBlock = whatsappContactUrl
    ? liquidCtaWhatsApp(whatsappContactUrl, '💬 Contactar vía WhatsApp')
    : ''

  const bodyHtml = [liquidPanel(contactTable, 'Datos del contacto'), vcardNote, whatsappBlock].join('')

  return wrapLiquidEmail({
    title: labels.title,
    subtitle: labels.subtitle,
    badge: labels.badge,
    bodyHtml,
    footerNote: 'Humano SISU · Notificación interna de captación',
  })
}
