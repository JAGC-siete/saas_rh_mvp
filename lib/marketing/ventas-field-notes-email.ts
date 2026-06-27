import { getMarketingSiteUrl } from './unsubscribe'
import { buildMissionTextFooter } from './mission-config'

const VENTAS_FIELD_NOTE_SUBJECTS: Record<number, string> = {
  0: 'Nota #0: su PDF ya salió — qué revisar primero',
  1: 'Nota #1: horas de planilla vs inversión mensual',
  2: 'Nota #2: la ventana del 20% cierra pronto',
  3: 'Nota #3: implementación y biométrico (sin sorpresas)',
  4: 'Nota #4: lo que vio en el trial vs su operación real',
  5: 'Nota #5: ¿seguimos con la contratación?',
}

export function getVentasSequenceSubject(step: number): string {
  return VENTAS_FIELD_NOTE_SUBJECTS[step] ?? ''
}

function firstName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Hola'
}

export function buildVentasWelcomeText(): string {
  return [
    'Hola,',
    '',
    'Ayer le enviamos la propuesta en PDF. Si no la ve, busque jorgearturo@humanosisu.net (revise spam).',
    '',
    'Hoy solo tres cosas para revisar en el documento:',
    '1. Rango tarifario según su número de empleados.',
    '2. Modalidad anual vs mensual (y qué incluye cada una).',
    '3. Oferta por contratación temprana, si aplica en su caso.',
    '',
    'También incluimos acceso de evaluación — úselo para contrastar el PDF con el sistema en vivo.',
    '',
    'Mañana le escribo sobre cómo justificar la inversión frente a las horas que hoy van a Excel.',
    '',
    '— Jorge',
  ].join('\n')
}

type VentasNoteParams = {
  nombre?: string | null
  email?: string
  leadToken?: string | null
}

export function buildVentasPainPoint1Text(params: VentasNoteParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Una pregunta directa: ¿cuántas horas al mes dedica su equipo (o usted) a cruzar asistencia, calcular deducciones y armar comprobantes?',
    '',
    'Multiplique eso por el costo hora de quien lo hace. Casi siempre supera la inversión mensual del software.',
    '',
    'Use el PDF que le enviamos como referencia para esa conversación interna.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(1, params.leadToken, 'ventas')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildVentasPainPoint2Text(params: VentasNoteParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Si cotizó en modalidad anual, la oferta del 20% sobre software tiene ventana de 72 horas desde el envío del PDF.',
    '',
    'No es presión de venta — es el mismo descuento que figura en su propuesta. Después de esa fecha, el monto listado vuelve al precio estándar.',
    '',
    'Si necesita un día más para revisarlo con gerencia, responda este correo.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(2, params.leadToken, 'ventas')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildVentasPainPoint3Text(params: VentasNoteParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'La objeción más común que escucho: "¿Cuánto tarda implementar?" y "¿Qué pasa con nuestro reloj biométrico?"',
    '',
    'Respuesta corta: el acceso de evaluación ya está activo; la implementación formal la coordinamos cuando usted decida contratar.',
    '',
    'Si tiene biométrico físico, respondemos con la guía de conexión sin costo adicional en la fase de evaluación.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(3, params.leadToken, 'ventas')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildVentasPainPoint4Text(params: VentasNoteParams): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  let body = [
    `Hola ${name},`,
    '',
    'El trial incluido sirve para una cosa: comparar lo que promete el PDF con lo que hace el sistema con datos de prueba.',
    '',
    `Entre aquí con las credenciales que le enviamos: ${site}/app/login`,
    '',
    'Si ya lo hizo, la pregunta útil es: ¿le da más tranquilidad que su Excel actual a fin de mes?',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(4, params.leadToken, 'ventas')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildVentasPainPoint5Text(params: VentasNoteParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Última nota de esta serie de seguimiento.',
    '',
    'Si la propuesta encaja con su operación, el siguiente paso es formalizar: datos bancarios, modalidad y fecha de arranque.',
    '',
    'Responda con "quiero continuar contratación" o escríbanos por WhatsApp (el enlace está en su PDF).',
    '',
    'Si aún no es el momento, no hay problema — conservamos su cotización como referencia.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(5, params.leadToken, 'ventas')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}
