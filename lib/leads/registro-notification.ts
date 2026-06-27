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
    subtitle: 'Lead solicitó más información desde /secreto',
  },
}

const CONTACT_SENDER_HINT = 'jorgearturo@humanosisu.net'

export function buildLeadFollowUpWhatsAppMessage(source: LeadRegistroSource): string {
  if (source === 'info') {
    return [
      '¡Secreto enviado! 🪄',
      '',
      'Leerás ese correo en menos de 1 minuto y tu primera reacción va a ser: "¿qué tiene esto que ver conmigo?".',
      '',
      'Pero para que no te quedes con la duda:',
      '',
      '1. Abrí la app de tu correo.',
      '',
      `2. En "🔎 buscar " escribe ${CONTACT_SENDER_HINT}`,
      '',
      'Y contesta: En tu trabajo actual; ¿Qué tan difícil es conseguir una constancia de trabajo?',
    ].join('\n')
  }

  if (source === 'activar') {
    return [
      '¡Tu entorno ya está listo! 🚀',
      '',
      'Acabo de mandarte las llaves (tus credenciales de acceso) para que entres a curiosear a tu propio ritmo. Cuando entres y des un par de clics, vas a pensar: "¿Por qué los otros sistemas hacen que esto parezca tan complicado?".',
      '',
      `Ve a tu correo ahora mismo, busca a ${CONTACT_SENDER_HINT} y entra al sistema.`,
      '',
      'Si no ves el correo con tus contraseñas (a veces caen en spam), reclámamelo por aquí ya mismo. No dejes que la tecnología te retrase.',
    ].join('\n')
  }

  if (source === 'ventas') {
    return [
      '¡Números enviados! 🤝',
      '',
      'Odio cuando las empresas esconden sus precios, así que te acabo de mandar tu cotización clara, directa y sin letras pequeñas.',
      '',
      'Pero no solo eso: también te incluí las llaves del sistema. Para que entres hoy mismo y veas con tus propios ojos exactamente qué es lo que hace SISU.',
      '',
      `Ve a tu correo ya mismo. Busca a ${CONTACT_SENDER_HINT} para ver los números y tus accesos. Si por alguna razón no te llega (revisa spam), avísame de inmediato para reenviártelo.`,
    ].join('\n')
  }

  if (source === 'suscripcion') {
    return [
      'Revisaste tus deducciones — ahora mirá tu correo.',
      '',
      `Buscá a ${CONTACT_SENDER_HINT}`,
      '',
      'La primera nota se lee en menos de 1 minuto.',
    ].join('\n')
  }

  return ''
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
