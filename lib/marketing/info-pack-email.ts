import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { buildInfoPackEmailHtml } from './info-pack-email-html'
import { appendUnsubscribeFooter, getMarketingSiteUrl } from './unsubscribe'

export const INFO_PACK_SUBJECT =
  'Lo prometido: El truco para que el trabajo aburrido se haga solo 🪄'

/** @deprecated Use INFO_PACK_SUBJECT */
export const INFO_PACK_SUBJECT_PREFIX = INFO_PACK_SUBJECT

/** Hours after info pack before Step 0 (welcome) of the pain-point sequence. */
export const INFO_SEQUENCE_WELCOME_DELAY_HOURS = 24

function displayName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

function firstName(raw?: string | null, email?: string): string {
  const full = displayName(raw, email)
  return full.split(/\s+/)[0] || full
}

export function buildInfoPackSubject(_nombre?: string | null, _email?: string): string {
  return INFO_PACK_SUBJECT
}

export function buildInfoPackEmailText(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  const body = [
    `Hola ${name},`,
    '',
    'El "truco" es más simple de lo que parece: Digitaliza el registro de asistencia a la oficina.',
    '',
    'Para que el trabajo más aburrido se haga solo, usamos el reloj biométrico SISU. En lugar de que una persona anote las horas a mano a fin de mes, el reloj registra, almacena, opera y presenta el trabajo pesado por ti.',
    '',
    'En pocas palabras, así es como te quitas el peso de encima:',
    '',
    '• Asistencia en tiempo real: Se conecta por internet a un reloj inteligente. Puedes ver desde tu celular o computadora quién llegó y a qué hora, sin tener que revisar libretas ni hojas de firmas.',
    '• Los pagos se calculan solos: Te olvidas de hacer las sumas a mano. El sistema ya sabe cómo calcular todo (incluyendo IHSS, RAP o ISR según las reglas de tu país).',
    '• Cero registros perdidos: Los permisos, vacaciones y datos importantes de tu equipo quedan guardados en un solo lugar seguro, y no perdidos en un chat de WhatsApp.',
    '',
    '¿Para quién funciona mejor este truco?',
    'Está pensado para dueños, encargados o contadores de equipos de 5 a 200 personas (en Honduras, El Salvador o Guatemala) que quieren tener todo el control de su gente en una sola pantalla, y que quieren empezar rápido (se configura en días, no en meses).',
    '',
    '¿Qué sigue ahora?',
    'Como te prometí: cero venta. No tienes que decidir nada hoy ni hablar con ningún vendedor si no quieres.',
    '',
    'Pero si te da curiosidad ver si funcionaría en tu empresa o cómo se vería en tu empresa, aquí te dejo los enlaces directos:',
    '',
    `→ Quiero ver cómo funciona: ${site}/activar`,
    `→ Ver precios sin compromiso: ${site}/ventas`,
    '',
    'Un saludo,',
    '',
    'Equipo Humano SISU',
    '',
    'PD: En los próximos días te voy a mandar 5 correos breves. Te voy a contar sobre algunos errores súper comunes (y que cuestan dinero) que casi todo el mundo comete al organizar a su personal. ¡Nos leemos pronto!',
  ].join('\n')

  return appendUnsubscribeFooter(body, params.unsubscribeToken)
}

export type SendInfoPackEmailInput = {
  to: string
  nombre?: string | null
  unsubscribeToken: string
  dryRun?: boolean
}

export async function sendInfoPackEmail(input: SendInfoPackEmailInput): Promise<void> {
  if (input.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const subject = buildInfoPackSubject(input.nombre, input.to)
  const text = buildInfoPackEmailText({
    nombre: input.nombre,
    email: input.to,
    unsubscribeToken: input.unsubscribeToken,
  })
  const html = buildInfoPackEmailHtml({
    nombre: input.nombre,
    email: input.to,
    unsubscribeToken: input.unsubscribeToken,
  })

  await resend.emails.send({
    from: getResendFromContact(),
    to: input.to,
    subject,
    html,
    text,
  })
}
