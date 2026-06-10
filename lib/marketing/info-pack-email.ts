import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { buildInfoPackEmailHtml } from './info-pack-email-html'
import { appendUnsubscribeFooter, getMarketingSiteUrl } from './unsubscribe'

export const INFO_PACK_SUBJECT_PREFIX = 'La info que pediste sobre nómina y RH para PyMEs'

/** Hours after info pack before Step 0 (welcome) of the pain-point sequence. */
export const INFO_SEQUENCE_WELCOME_DELAY_HOURS = 24

function displayName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

export function buildInfoPackSubject(nombre?: string | null, email?: string): string {
  const name = displayName(nombre, email)
  const first = name.split(/\s+/)[0] || name
  return `${first}, esto es Humano SISU en 3 minutos`
}

export function buildInfoPackEmailText(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const name = displayName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  const body = [
    `Hola ${name},`,
    '',
    'Gracias por pedir más información sobre Humano SISU.',
    '',
    'Te resumo en pocas líneas qué es y si te puede servir — sin activar trial ni cotización todavía.',
    '',
    '---',
    '',
    '¿QUÉ ES SISU?',
    '',
    'Humano SISU es un software de Recursos Humanos para PyMEs en Centroamérica.',
    'Centraliza lo que hoy suele estar repartido en Excel, WhatsApp y carpetas:',
    '',
    '• Nómina (IHSS, RAP, ISR según país)',
    '• Control de asistencia (incluye integración biométrica)',
    '• Permisos y vacaciones',
    '• Expedientes y reportes para gerencia',
    '',
    'Está pensado para equipos de 5 a 200 empleados que quieren dejar de calcular planilla a mano.',
    '',
    '---',
    '',
    '¿CÓMO FUNCIONA?',
    '',
    'El sistema se conecta por internet con un reloj biométrico inteligente.',
    '',
    'Esto permite dos cosas:',
    '',
    '1. Visualización de asistencia en tiempo real desde cualquier dispositivo (celular, tablet, laptop, Mac, etc.).',
    '2. Cálculo de nóminas parametrizado y automatizado.',
    '',
    'El sistema cuenta además con módulos de ficha de personal, control de permisos y vacaciones, y generación de reportes en distintos formatos (Excel, PDF, TXT, CSV).',
    '',
    '---',
    '',
    '¿PARA QUIÉN ES?',
    '',
    '✓ Empresas en Honduras, El Salvador o Guatemala',
    '✓ Dueños, gerentes de RRHH o contadores que quieren un solo lugar para el dato del personal',
    '✓ Equipos que buscan implementación ágil (días, no meses)',
    '',
    '---',
    '',
    '¿CÓMO SE EMPIEZA? (cuando estés listo)',
    '',
    'No tienes que decidir hoy. Cuando quieras profundizar:',
    '',
    `→ Probar el sistema: ${site}/activar`,
    `→ Ver precios / cotización: ${site}/ventas`,
    '→ Seguir leyendo: en los próximos días te enviaremos ideas prácticas sobre gestión de personal',
    '',
    'Si prefieres hablar con alguien, responde a este correo.',
    '',
    '---',
    '',
    'Humano SISU',
    'Software de RH para PyMEs en Centroamérica',
    site,
    '',
    'En los próximos días recibirás 4 correos breves sobre errores comunes en la gestión de personal.',
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
