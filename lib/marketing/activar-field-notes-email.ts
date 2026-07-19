import { getMarketingSiteUrl } from './unsubscribe'
import { buildMissionTextFooter } from './mission-config'

export const ACTIVAR_ONBOARDING_LEDGER_LABEL = 'Activar Trial'

const ACTIVAR_FIELD_NOTE_SUBJECTS: Record<number, string> = {
  0: 'Nota #0: ya tocás las nubes — el primer paso tarda 4 minutos',
  1: 'Nota #1: la diferencia entre digitalizar y dejar de reprocesar',
  2: 'Nota #2: "esto va a tomar meses" (spoiler: ya encendiste)',
  3: 'Nota #3: el error que no sale hasta que alguien pregunta',
  4: 'Nota #4: reloj en la puerta, Excel en la oficina',
  5: 'Nota #5: ¿te devolvió tiempo o solo curiosidad?',
}

export function getActivarSequenceSubject(step: number): string {
  return ACTIVAR_FIELD_NOTE_SUBJECTS[step] ?? ''
}

function firstName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Hola'
}

export function buildActivarWelcomeText(): string {
  return [
    'Hola,',
    '',
    'Tocaste las nubes — eso ya te separa de quien sigue cruzando Excel a mano.',
    '',
    'Hoy solo una cosa: entrá con las credenciales que te mandé y mirá una nómina de prueba calcularse sola. Sin configurar nada raro. Alcanzá la paz en 4 minutos.',
    '',
    'Si no ves el correo, buscá humanosisu@humanosisu.net (revisá spam).',
    '',
    'Mañana te mando qué mirar primero para saber si esto te devuelve horas de verdad.',
    '',
    '— Jorge',
  ].join('\n')
}

type ActivarPainPointParams = {
  nombre?: string | null
  email?: string
  leadToken?: string | null
}

export function buildActivarPainPoint1Text(params: ActivarPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Si alguna vez bajaste marcajes a USB para pegarlos en Excel, ya sabés cómo se siente el reprocesamiento.',
    '',
    'En el entorno de prueba, fijate en esto: el dato no "salta" de un lado a otro — viaja. Esa es la diferencia que importa.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(1, params.leadToken, 'activar')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildActivarPainPoint2Text(params: ActivarPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Mucha gente frena porque cree que un sistema nuevo = meses de curva.',
    '',
    'Vos ya pasaste la parte difícil: encendiste el entorno. Lo que falta es mirar si el resultado te devuelve tiempo — no aprender teoría.',
    '',
    'Si en 10 minutos no ves algo útil, no pasa nada. Pero dale esos 10 minutos.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(2, params.leadToken, 'activar')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildActivarPainPoint3Text(params: ActivarPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'El costo oculto no siempre es un monto mal calculado.',
    '',
    'A veces es la duda: "¿Está bien esta planilla?" mientras alguien revisa Excel otra vez.',
    '',
    'En la prueba, compará: mismo período, mismo equipo ficticio — ¿cuánto tardás en confiar en el número?',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(3, params.leadToken, 'activar')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildActivarPainPoint4Text(params: ActivarPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Biométrico en la entrada + planilla en Excel no es automatizar.',
    '',
    'Es digitalizar la captura y seguir reprocesando la ejecución.',
    '',
    'Si eso te suena familiar, usá el entorno de prueba para ver qué pasa cuando captura y cálculo viven en el mismo sitio.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(4, params.leadToken, 'activar')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildActivarPainPoint5Text(params: ActivarPainPointParams): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  let body = [
    `Hola ${name},`,
    '',
    'Última nota de esta serie de arranque.',
    '',
    'Si el entorno te devolvió aunque sea una hora que antes iba a Excel o WhatsApp, vale la pena hablar de tu caso real.',
    '',
    `Respondé este correo con "quiero verlo con mi operación" o entrá aquí: ${site}/ventas`,
    '',
    'Si no, no pasa nada — el trial sigue corriendo hasta que expire.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(5, params.leadToken, 'activar')
    body +=
      '\n\nPD: Si necesitás conectar biométrico físico, respondé a este correo y te guiamos sin costo.'
  } else {
    body +=
      '\n\nPD: Si necesitás conectar biométrico físico, respondé a este correo y te guiamos sin costo.\n\n— Jorge'
  }

  return body
}
