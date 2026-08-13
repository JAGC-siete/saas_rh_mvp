import { getMarketingSiteUrl } from './unsubscribe'
import { buildMissionTextFooter } from './mission-config'

export const SUSCRIPCION_PACK_SUBJECT =
  'Lo que calculaste, por escrito — y qué revisar en tu próximo recibo'

const SUSCRIPCION_FIELD_NOTE_SUBJECTS: Record<number, string> = {
  0: 'Nota #0: revisaste tus números — eso ya te pone adelante',
  1: 'Nota #1: cuando el recibo no cuadra',
  2: 'Nota #2: deducciones que nadie te explica',
  3: 'Nota #3: fechas que no te pueden agarrar desprevenido',
  4: 'Nota #4: qué hacer si los números no coinciden',
  5: 'Nota #5: última nota de la serie',
}

export function getSuscripcionSequenceSubject(step: number): string {
  return SUSCRIPCION_FIELD_NOTE_SUBJECTS[step] ?? ''
}

function firstName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Hola'
}

export function buildSuscripcionPackEmailBody(params: { nombre?: string | null; email: string }): string {
  const name = firstName(params.nombre, params.email)

  return [
    `Hola ${name},`,
    '',
    'Acabás de hacer algo que casi nadie hace: revisar si lo que te descontaron cuadra con la ley — en lugar de confiar en "lo que siempre me han pagado".',
    '',
    'Te dejo por escrito lo que viste en pantalla, por si querés guardarlo o compararlo con tu próximo recibo.',
    '',
    'Qué vas a recibir de acá en adelante:',
    '• Recordatorios de fechas que importan (aguinaldo, catorceavo, etc.)',
    '• Explicaciones claras cuando cambian deducciones',
    '• Guías para entender tu recibo sin jerga de RRHH',
    '',
    'Un saludo,',
    '',
    'Jorge',
    '',
    'PD: Mañana te mando la primera nota — algo que veo una y otra vez cuando la gente compara su cálculo con el recibo real.',
  ].join('\n')
}

export function buildSuscripcionWelcomeText(): string {
  return [
    'Hola,',
    '',
    'Te quedaste — y eso ya te separa de quien cierra la pestaña después de ver el resultado.',
    '',
    'Mañana te mando la primera comparación concreta: qué pasa cuando el número del recibo no coincide con lo que calculaste.',
    '',
    'Hoy no tenés que hacer nada más.',
    '',
    '— Jorge',
  ].join('\n')
}

type SuscripcionPainPointParams = {
  nombre?: string | null
  email?: string
  leadToken?: string | null
}

export function buildSuscripcionPainPoint1Text(params: SuscripcionPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'La frase más común cuando alguien usa la calculadora:',
    '',
    '"En mi recibo siempre sale un poco distinto, pero nunca le he preguntado a nadie."',
    '',
    'No es paranoia. A veces es un redondeo. A veces es un rubro mal aplicado. A veces llevan años así y nadie lo notó.',
    '',
    'Si calculaste X y en el recibo ves Y, no asumas que "así es". Anotá la diferencia. Guardá el cálculo. Compará el próximo mes.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(1, params.leadToken, 'suscripcion')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildSuscripcionPainPoint2Text(params: SuscripcionPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'IHSS, RAP, ISR, ISSS, AFP… en el recibo aparecen siglas que casi nadie te explica.',
    '',
    'No tenés que ser contador para entender lo básico:',
    '• Seguro social: aporte tuyo + aporte del patrono (no es "un cobro extra" arbitrario)',
    '• Impuesto sobre la renta: depende de cuánto ganás y de la tabla vigente',
    '• Otros rubros: deben aparecer en letra legible, no escondidos',
    '',
    'Si no sabés para qué es cada línea, es más difícil notar cuando algo cambió sin aviso.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(2, params.leadToken, 'suscripcion')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildSuscripcionPainPoint3Text(params: SuscripcionPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Hay fechas que no te pueden agarrar desprevenido:',
    '',
    '• Aguinaldo (13vo): plazos legales según tu país',
    '• Catorceavo (14vo): en Honduras, julio es el mes clave',
    '• Cambios en deducciones: cuando la ley se actualiza, tu recibo debería reflejarlo',
    '',
    'Mucha gente se entera tarde — cuando ya pasó la fecha o cuando el monto no cuadra.',
    '',
    'Por eso mandamos recordatorios: para que no dependas solo de lo que te diga el recibo.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(3, params.leadToken, 'suscripcion')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildSuscripcionPainPoint4Text(params: SuscripcionPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Si comparaste tu cálculo con el recibo y no cuadra, estos pasos ayudan:',
    '',
    '1. Anotá la diferencia exacta (monto y rubro)',
    '2. Volvé a calcular con los mismos datos del recibo (bruto, período, deducciones activas)',
    '3. Si sigue sin cuadrar, preguntá en RRHH con calma y con números en mano',
    '4. Guardá captura del cálculo y del recibo — por si hace falta revisar el mes siguiente',
    '',
    'No se trata de pelear. Se trata de entender qué pasó.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(4, params.leadToken, 'suscripcion')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildSuscripcionPainPoint5Text(params: SuscripcionPainPointParams): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  let body = [
    `Hola ${name},`,
    '',
    'Última nota de esta serie.',
    '',
    'Seguirás recibiendo alertas cuando haya cambios legales que afecten tu sueldo.',
    '',
    'Ya hiciste lo importante: revisar tus propios números en lugar de confiar ciegamente.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(5, params.leadToken, 'suscripcion')
    body += `\n\nPD: Si en tu trabajo la planilla parece un lío y creés que a RRHH le serviría una herramienta que calcule como esta calculadora — podés compartirles esto: ${site}/calculadora`
  } else {
    body += `\n\nPD: Si en tu trabajo la planilla parece un lío y creés que a RRHH le serviría una herramienta que calcule como esta calculadora — podés compartirles esto: ${site}/calculadora\n\n— Jorge`
  }

  return body
}
