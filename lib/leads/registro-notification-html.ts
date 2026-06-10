import type { LeadRegistroNotificationData, LeadRegistroSource } from './registro-notification'
import { VENTAS_BRAND as B } from '../ventas/brand-styles'

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
    subtitle: 'Lead solicitó más información desde /info',
    badge: 'Más información',
  },
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sourcePath(source: LeadRegistroSource): string {
  return source === 'suscripcion' ? '/suscripcion' : `/${source}`
}

function infoRow(label: string, value: string, valueIsLink = false): string {
  const valueHtml = valueIsLink
    ? `<a href="mailto:${escapeHtml(value)}" style="color: ${B.primary}; text-decoration: none;">${escapeHtml(value)}</a>`
    : escapeHtml(value)

  return `
    <tr>
      <td style="padding: 8px 0; color: ${B.textMuted}; font-size: 13px; vertical-align: top; width: 38%;">${label}</td>
      <td style="padding: 8px 0; color: ${B.textBody}; font-size: 14px; vertical-align: top; font-weight: 500;">${valueHtml}</td>
    </tr>
  `
}

function buildExtraRows(data: LeadRegistroNotificationData): string {
  const rows: string[] = []

  if (data.whatsapp) {
    rows.push(infoRow('📱 WhatsApp', data.whatsapp))
  }
  if (data.empleados != null) {
    rows.push(infoRow('👥 Empleados', String(data.empleados)))
  }
  if (data.country_code) {
    rows.push(infoRow('🌎 País (nómina)', data.country_code))
  }
  if (data.tenant_id) {
    rows.push(infoRow('🆔 Tenant ID', data.tenant_id))
  }
  if (data.quote_id) {
    rows.push(infoRow('📄 Cotización ID', data.quote_id))
  }
  if (data.billing_modality) {
    rows.push(infoRow('💳 Modalidad', data.billing_modality))
  }
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
  const title = escapeHtml(labels.title)
  const subtitle = escapeHtml(labels.subtitle)
  const badge = escapeHtml(labels.badge)

  const whatsappButton = whatsappContactUrl
    ? `
      <div style="text-align: center; margin: 22px 0 8px 0;">
        <a href="${escapeHtml(whatsappContactUrl)}"
           style="display: inline-block; padding: 13px 26px; background-color: ${B.accent}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">
          💬 Contactar vía WhatsApp
        </a>
      </div>
    `
    : ''

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #eef2f7; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${B.primary} 0%, #1976d2 100%); padding: 28px 26px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9;">📋 ${badge}</p>
        <h1 style="margin: 0; font-size: 22px; font-weight: bold; line-height: 1.3;">${title}</h1>
        <p style="margin: 12px 0 0 0; font-size: 14px; opacity: 0.92; line-height: 1.5;">${subtitle}</p>
      </div>

      <div style="background: ${B.panelBgAlt}; padding: 26px 24px 28px 24px; border-radius: 0 0 12px 12px; border: 1px solid ${B.panelBorder}; border-top: none;">
        <div style="background: white; padding: 20px 22px; border-radius: 10px; margin: 0 0 16px 0; border-left: 4px solid ${B.primary}; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);">
          <p style="margin: 0 0 14px 0; font-size: 11px; font-weight: bold; color: ${B.primary}; text-transform: uppercase; letter-spacing: 0.06em;">Datos del contacto</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            ${infoRow('👤 Nombre', data.nombre)}
            ${infoRow('🏢 Empresa', empresa)}
            ${infoRow('📧 Email', data.email, true)}
            ${buildExtraRows(data)}
          </table>
        </div>

        <div style="background: ${B.urgencyBg}; border: 1px solid ${B.urgencyBorder}; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 18px 20px; margin: 0 0 16px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: ${B.urgencyText};">📎 Archivo vCard adjunto</p>
          <p style="margin: 0 0 10px 0; font-size: 13px; color: ${B.textBody}; line-height: 1.55;">
            Se ha adjuntado un archivo de contacto (.vcf) que puedes descargar e importar directamente a tu libreta de contactos en el celular.
          </p>
          <p style="margin: 0 0 6px 0; font-size: 13px; color: ${B.textBody}; line-height: 1.55;">
            <strong>Para importar en iPhone:</strong> Abre el archivo adjunto y toca &quot;Agregar a contactos&quot;.
          </p>
          <p style="margin: 0; font-size: 13px; color: ${B.textBody}; line-height: 1.55;">
            <strong>Para importar en Android:</strong> Descarga el archivo y ábrelo con la app de Contactos.
          </p>
        </div>

        ${whatsappButton}

        <p style="margin: 16px 0 0 0; text-align: center; font-size: 12px; color: ${B.textMuted}; line-height: 1.5;">
          Humano SISU · Notificación interna de captación
        </p>
      </div>
    </div>
  </body>
</html>`
}
