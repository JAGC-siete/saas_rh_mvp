import type { CountryCode } from '../country/supported'
import { getResendFromContact } from '../resend-from'

export type LeadRegistroSource = 'activar' | 'ventas' | 'suscripcion'

export interface LeadRegistroNotificationData {
  source: LeadRegistroSource
  nombre: string
  empresa?: string | null
  email: string
  whatsapp?: string | null
  country_code?: CountryCode
  empleados?: number | null
  tenant_id?: string | null
  quote_id?: string | null
  billing_modality?: string | null
  monthly_total?: number | null
  currency?: string | null
}

const CONTACT_SENDER_HINT = 'jorgearturo@humanosisu.net'

const SOURCE_LABELS: Record<LeadRegistroSource, { title: string; subtitle: string }> = {
  activar: {
    title: 'Nuevo Registro en SISU',
    subtitle: 'Trial activado desde /activar',
  },
  ventas: {
    title: 'Nueva Cotización en SISU',
    subtitle: 'Lead completó el formulario en /ventas',
  },
  suscripcion: {
    title: 'Nueva Suscripción en SISU',
    subtitle: 'Lead se suscribió desde /suscripcion',
  },
}

export function buildLeadFollowUpWhatsAppMessage(source: LeadRegistroSource): string {
  const senderHint = `(Si no ves el correo de bienvenida, búscalo como remitente: ${CONTACT_SENDER_HINT}).`

  if (source === 'activar') {
    return [
      '¡Ya hiciste lo más difícil, de verdad! 🙌 Tu sistema SISU ya está activo.',
      '',
      senderHint,
      '',
      'El 90% de las empresas se traban en el inicio, pero tú ya diste el primer paso. El siguiente paso para completar tu automatización es digitalizar la asistencia.',
      '',
      '¿Te parece si lo dejamos listo hoy? Cuéntame si pudiste revisar el correo. 👇',
    ].join('\n')
  }

  if (source === 'ventas') {
    return [
      '¡Ya diste el primer paso con tu cotización! 🙌 Tu acceso a SISU ya está en camino.',
      '',
      `(Si no ves el correo con tu cotización y acceso, búscalo como remitente: ${CONTACT_SENDER_HINT}).`,
      '',
      'El siguiente paso es revisar la propuesta y activar tu automatización de nómina.',
      '',
      '¿Te parece si lo revisamos hoy juntos? Cuéntame si pudiste ver el correo. 👇',
    ].join('\n')
  }

  return [
    '¡Gracias por unirte! 🙌 Ya estás en la lista de SISU.',
    '',
    senderHint,
    '',
    'Muchas empresas se quedan en lo manual por no dar el primer paso — tú ya lo diste.',
    '',
    '¿Te parece si conversamos sobre cómo automatizar tu nómina? Cuéntame si pudiste revisar el correo. 👇',
  ].join('\n')
}

function getWhatsAppCallingCode(countryCode: CountryCode): string {
  if (countryCode === 'SLV') return '503'
  if (countryCode === 'GTM') return '502'
  return '504'
}

export function normalizeWhatsAppForWaMe(
  whatsapp: string,
  countryCode: CountryCode = 'HND'
): string {
  const digits = whatsapp.replace(/\D/g, '')
  const calling = getWhatsAppCallingCode(countryCode)
  if (digits.startsWith(calling)) return digits
  return `${calling}${digits}`
}

function generarVCard(data: {
  nombre: string
  empresa: string
  email: string
  whatsapp: string | null
  countryCode?: CountryCode
}): string {
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${data.nombre}`,
    `ORG:${data.empresa}`,
    `EMAIL;TYPE=INTERNET:${data.email}`,
  ]

  if (data.whatsapp) {
    const phone = data.whatsapp.replace(/[-\s]/g, '')
    const cc = data.countryCode || 'HND'
    const calling = getWhatsAppCallingCode(cc)
    const formattedPhone = phone.startsWith('+')
      ? phone
      : phone.startsWith(calling)
        ? `+${phone}`
        : `+${calling}${phone}`
    vcard.push(`TEL;TYPE=CELL:${formattedPhone}`)
  }

  vcard.push('END:VCARD')
  return vcard.join('\n')
}

function getNotificationDestinationEmail(): string {
  return (
    process.env.REGISTRO_NOTIFICATION_EMAIL ||
    process.env.VENTAS_NOTIFICATION_EMAIL ||
    'jorge7gomez@gmail.com'
  )
}

function buildExtraRows(data: LeadRegistroNotificationData): string {
  const rows: string[] = []

  if (data.whatsapp) {
    rows.push(`
      <div class="info-row">
        <span class="label">📱 WhatsApp:</span>
        <span class="value">${data.whatsapp}</span>
      </div>
    `)
  }

  if (data.empleados != null) {
    rows.push(`
      <div class="info-row">
        <span class="label">👥 Empleados:</span>
        <span class="value">${data.empleados}</span>
      </div>
    `)
  }

  if (data.country_code) {
    rows.push(`
      <div class="info-row">
        <span class="label">🌎 País (nómina):</span>
        <span class="value">${data.country_code}</span>
      </div>
    `)
  }

  if (data.tenant_id) {
    rows.push(`
      <div class="info-row">
        <span class="label">🆔 Tenant ID:</span>
        <span class="value">${data.tenant_id}</span>
      </div>
    `)
  }

  if (data.quote_id) {
    rows.push(`
      <div class="info-row">
        <span class="label">📄 Cotización ID:</span>
        <span class="value">${data.quote_id}</span>
      </div>
    `)
  }

  if (data.billing_modality) {
    rows.push(`
      <div class="info-row">
        <span class="label">💳 Modalidad:</span>
        <span class="value">${data.billing_modality}</span>
      </div>
    `)
  }

  if (data.monthly_total != null && data.currency) {
    rows.push(`
      <div class="info-row">
        <span class="label">💰 Total mensual:</span>
        <span class="value">${data.currency} ${data.monthly_total}</span>
      </div>
    `)
  }

  rows.push(`
    <div class="info-row">
      <span class="label">📍 Fuente:</span>
      <span class="value">/${data.source === 'suscripcion' ? 'suscripcion' : data.source}</span>
    </div>
  `)

  return rows.join('')
}

function buildEmailHtml(data: LeadRegistroNotificationData, whatsappContactUrl: string | null): string {
  const labels = SOURCE_LABELS[data.source]
  const empresa = data.empresa?.trim() || 'No especificada'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${labels.title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .info-box {
            background: white;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-row {
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
          .value {
            color: #333;
          }
          .vcard-note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 ${labels.title}</h1>
          <p>${labels.subtitle}</p>
        </div>
        <div class="content">
          <div class="info-box">
            <div class="info-row">
              <span class="label">👤 Nombre:</span>
              <span class="value">${data.nombre}</span>
            </div>
            <div class="info-row">
              <span class="label">🏢 Empresa:</span>
              <span class="value">${empresa}</span>
            </div>
            <div class="info-row">
              <span class="label">📧 Email:</span>
              <span class="value">${data.email}</span>
            </div>
            ${buildExtraRows(data)}
          </div>
          <div class="vcard-note">
            <strong>📎 Archivo vCard adjunto</strong>
            <p>Se ha adjuntado un archivo de contacto (.vcf) que puedes descargar e importar directamente a tu libreta de contactos en el celular.</p>
            <p><strong>Para importar en iPhone:</strong> Abre el archivo adjunto y toca "Agregar a contactos"</p>
            <p><strong>Para importar en Android:</strong> Descarga el archivo y ábrelo con la app de Contactos</p>
          </div>
          ${whatsappContactUrl ? `<div style="text-align: center; margin: 20px 0;"><a href="${whatsappContactUrl}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: Arial, sans-serif;">💬 Contactar vía WhatsApp</a></div>` : ''}
        </div>
      </body>
    </html>
  `
}

export async function sendLeadRegistroNotification(
  data: LeadRegistroNotificationData
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const emailDestino = getNotificationDestinationEmail()

    if (!apiKey) {
      console.log('⚠️ RESEND_API_KEY no configurado, saltando envío de email de resumen')
      return
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const empresa = data.empresa?.trim() || 'No especificada'
    const whatsappMessage = buildLeadFollowUpWhatsAppMessage(data.source)
    const whatsappContactUrl = data.whatsapp
      ? `https://wa.me/${normalizeWhatsAppForWaMe(data.whatsapp, data.country_code || 'HND')}?text=${encodeURIComponent(whatsappMessage)}`
      : null

    const vcardContent = generarVCard({
      nombre: data.nombre,
      empresa,
      email: data.email,
      whatsapp: data.whatsapp || null,
      countryCode: data.country_code,
    })

    const vcardBuffer = Buffer.from(vcardContent, 'utf-8')
    const labels = SOURCE_LABELS[data.source]
    const subjectSuffix = empresa !== 'No especificada' ? `${empresa} - ${data.nombre}` : data.nombre

    const result = await resend.emails.send({
      from: getResendFromContact(),
      to: emailDestino,
      subject: `📋 ${labels.title}: ${subjectSuffix}`,
      html: buildEmailHtml(data, whatsappContactUrl),
      attachments: [
        {
          filename: `${data.nombre.replace(/[^a-z0-9]/gi, '_')}_${empresa.replace(/[^a-z0-9]/gi, '_')}.vcf`,
          content: vcardBuffer.toString('base64'),
        },
      ],
    })

    if ((result as { error?: unknown })?.error) {
      console.error('❌ Error enviando email de resumen:', (result as { error?: unknown }).error)
      return
    }

    console.log('✅ Email de resumen con vCard enviado exitosamente:', (result as { id?: string })?.id)
  } catch (error) {
    console.error('❌ Error enviando email de resumen:', error)
  }
}
