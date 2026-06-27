import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { buildInfoPackEmailHtml } from './info-pack-email-html'
import { appendUnsubscribeFooter, getMarketingSiteUrl } from './unsubscribe'

export const INFO_PACK_SUBJECT =
  'Lo prometido: El truco para que el trabajo aburrido se haga solo 🪄'

/** Ledger label for the immediate /info pack (distinct from sequence Welcome at +24h). */
export const INFO_PACK_LEDGER_LABEL = 'Info Pack'

/** @deprecated Use INFO_PACK_SUBJECT */
export const INFO_PACK_SUBJECT_PREFIX = INFO_PACK_SUBJECT

export { INFO_SEQUENCE_WELCOME_DELAY_HOURS } from './info-sequence-timing'

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
    'Si acabas de ver el extracto confidencial en nuestra pantalla, ya sabes de qué hablo. El gran error de la mayoría de empresas en Honduras, El Salvador y Guatemala es caer en la trampa de la "pseudo-digitalización".',
    '',
    'Ponen un reloj biométrico en la entrada (digitalizan), pero siguen usando Excel para procesar la planilla a mano (no automatizan). Al final, terminan atrapados en el círculo del reprocesamiento: descargar datos a una USB, subirlos a la computadora, pelear con fórmulas de Excel que se rompen y perseguir permisos por WhatsApp. Sigue siendo trabajo manual, solo que más caro.',
    '',
    'El verdadero "truco" de Humano SISU no es venderte un software; es conectar la captura con la ejecución para que puedas DELEGAR.',
    '',
    'En pocas palabras, así es como eliminamos el reprocesamiento:',
    '',
    '• Conexión directa en la nube: El empleado pone su huella o rostro en el reloj inteligente y el dato viaja directo a tu cuenta. No más archivos CSV, no más memorias USB, no más hojas de firmas impresas.',
    '• El motor legal calcula solo: Te olvidas de las sumas a mano. El sistema procesa la asistencia y calcula los pagos exactos (incluyendo deducciones de IHSS, RAP, ISR, ISSS o IGSS según tu país).',
    '• Todo centralizado en un clic: Permisos, vacaciones y constancias de trabajo se generan de forma automática basados en la asistencia real, sin que tengas que digitar nada dos veces.',
    '',
    '¿Para quién funciona este truco?',
    'Está pensado exclusivamente para dueños, contadores o encargados de equipos de 5 a 200 personas en la región que están cansados de ser el "puente humano" que traslada datos de un sistema a otro, y quieren recuperar la paz de sus semanas.',
    '',
    '¿Qué sigue ahora?',
    'Como leíste en el dossier: cero venta. No tienes que decidir nada hoy ni hablar con ningún vendedor molesto. Tu atención es valiosa.',
    '',
    'Pero si tienes curiosidad de ver cómo luce el motor legal por dentro sin interactuar con humanos, aquí tienes los accesos directos:',
    '',
    `→ Quiero ver el motor en funcionamiento (30 seg): ${site}/activar`,
    `→ Ver tablas de precios transparentes: ${site}/ventas`,
    '',
    'Un saludo,',
    '',
    'Jorge · Humano SISU',
    '',
    'PD: Acabas de completar la Misión 0. En las próximas horas se activará la Misión 1 en tu bandeja de entrada. Te voy a contar sobre "La trampa de: siempre lo hemos hecho así" y el costo invisible que estás pagando hoy por mantener procesos manuales. ¡Nos leemos pronto!',
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
