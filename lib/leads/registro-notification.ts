import type { CountryCode } from '../country/supported'
import { getResendFromContact } from '../resend-from'
import { buildLeadRegistroNotificationHtml } from './registro-notification-html'

export type LeadRegistroSource = 'activar' | 'ventas' | 'suscripcion' | 'info'

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
  info: {
    title: 'Nueva Solicitud de Información en SISU',
    subtitle: 'Lead solicitó más información desde /info',
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

  if (source === 'info') {
    return [
      '¡Gracias por tu interés! 🙌',
      '',
      `(Si no ves el correo en tu bandeja, búscalo el remitente: ${CONTACT_SENDER_HINT}).`,
      '',
      'Muchos profesionales se quedan con la duda por preguntar — tú ya preguntaste',
      '',
      'Cuéntame si recibiste el correo y si era la información que esperabas . 👇',
    ].join('\\n')
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
      html: buildLeadRegistroNotificationHtml(data, whatsappContactUrl),
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
