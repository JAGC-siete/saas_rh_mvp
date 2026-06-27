import { getMarketingSiteUrl } from './unsubscribe'
import { buildMissionActivarUrl, buildMissionTextFooter } from './mission-config'

export const INFO_PACK_SUBJECT_FIELD =
  'Lo prometido: lo que viste en pantalla, por escrito 🪄'

const INFO_FIELD_NOTE_SUBJECTS: Record<number, string> = {
  0: 'Nota de campo #0: la frase que congela todo',
  1: 'Nota de campo #1: "siempre lo hemos hecho así"',
  2: 'Nota de campo #2: el mito de los seis meses',
  3: 'Nota de campo #3: el costo de "creo que está bien"',
  4: 'Nota de campo #4: pseudo-digitalización',
  5: 'Nota de campo #5: cómo probar sin tumbar lo que ya funciona',
}

export function getInfoSequenceSubject(step: number): string {
  return INFO_FIELD_NOTE_SUBJECTS[step] ?? ''
}

function firstName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

export function buildInfoPackEmailBody(params: { nombre?: string | null; email: string }): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  return [
    `Hola ${name},`,
    '',
    'Acabas de hacer algo que casi nadie hace: leer el extracto completo antes de seguir adelante.',
    '',
    'Si viste la pantalla, ya tienes la idea central: mucha gente cree que "digitalizó" porque puso un reloj en la entrada… y a fin de quincena sigue bajando archivos, abriendo Excel y persiguiendo datos por WhatsApp. Eso no es automatizar. Es reprocesar con pantalla en vez de papel.',
    '',
    'Te dejo por escrito lo mismo — por si quieres guardarlo.',
    '',
    'Lo que veo una y otra vez en negocios de la región:',
    '• Capturan el dato en un lugar.',
    '• Lo mueven a mano a otro.',
    '• Lo vuelven a calcular en otro más.',
    '• Y alguien — casi siempre el dueño o una persona de confianza — termina siendo el "puente" entre sistemas que no se hablan.',
    '',
    'Eso cansa. Y casi nadie lo mide porque "así siempre lo hemos hecho".',
    '',
    'Si más adelante te da curiosidad ver cómo se ve cuando el dato viaja solo (sin USB, sin doble digitación), aquí están dos enlaces — úsalos solo si te apetece:',
    `→ Ver el motor en 30 segundos: ${site}/activar`,
    `→ Tablas de precios (sin llamadas): ${site}/ventas`,
    '',
    'Un saludo,',
    '',
    'Jorge',
    '',
    'PD: En los próximos días te mando unas notas cortas — una por email — sobre las trampas invisibles que veo en casi todos los negocios. La primera llega mañana. Solo leer si te interesa.',
  ].join('\n')
}

export function buildInfoWelcomeText(): string {
  return [
    'Hola,',
    '',
    'Te quedaste — y eso ya te separa de quien cierra el sobre a la mitad.',
    '',
    'Mañana te mando la primera nota sobre algo que escucho en casi todas las visitas:',
    '',
    '"Es que siempre lo hemos hecho así."',
    '',
    'No suena a problema. Suena a prudencia. Pero muchas veces es la razón por la que un negocio sigue regalando horas a lo repetitivo — aunque la solución sea más obvia de lo que parece.',
    '',
    'Hoy no necesitas hacer nada. Solo ten presente que el enemigo rara vez es "la tecnología". Es la inercia.',
    '',
    'Mañana, la primera trampa concreta.',
    '',
    '— Jorge',
  ].join('\n')
}

type InfoPainPointParams = {
  nombre?: string | null
  email?: string
  leadToken?: string | null
}

export function buildInfoPainPoint1Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'En el correo anterior te mandé el extracto del sobre. Hoy la primera trampa que veo en casi todos lados:',
    '',
    '"Es que siempre lo hemos hecho así."',
    '',
    'No es mala fe. Es miedo a tocar algo que "funciona más o menos".',
    '',
    'El problema: "más o menos" suele costar horas que nadie suma. Firmas, cruces, correcciones, "déjame revisar el Excel otra vez". Cosas pequeñas que a fin de mes pesan.',
    '',
    'Lo anoto en el margen: el riesgo no siempre es probar algo nuevo. A veces el riesgo es no cambiar y seguir pagando en tiempo lo que ya podría resolverse solo.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(1, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint2Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Otra frase que escucho mucho:',
    '',
    '"Eso de sistemas nuevos es complicado. Primero hay que instalarlo meses, enseñarle a todos…"',
    '',
    'A veces es verdad — con software pesado.',
    '',
    'Pero otras veces es una excusa cómoda para no mover nada y seguir con el Excel, la USB y el WhatsApp como sistema operativo real del negocio.',
    '',
    'Si una herramienta sirve, debería devolverte tiempo, no quitártelo.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(2, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint3Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Cuando los horarios, permisos y pagos viven repartidos — libreta, Excel, chats, memoria de alguien — casi siempre se escapa algo.',
    '',
    'Cinco minutos mal contados. Un permiso que no quedó anotado. Un cálculo hecho apurado un viernes.',
    '',
    'Parecen detalles. A fin de mes se sienten.',
    '',
    'El costo oculto no es solo el error. Es vivir con la duda: "¿Lo hicimos bien?"',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(3, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint4Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Algo que sigo viendo:',
    '',
    'Biométrico en la puerta. Excel en la oficina. WhatsApp en el bolsillo.',
    '',
    'Digitalizaron la captura. No la ejecución.',
    '',
    'El dato nace en un lugar y muere en otro. Alguien lo baja, lo sube, lo cruza, lo vuelve a digitar. Trabajo doble con mejor presentación.',
    '',
    'Si pasas más tiempo buscando y moviendo datos que usándolos, no es eficiencia. Es reprocesamiento disfrazado.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(4, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint5Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  let body = [
    `Hola ${name},`,
    '',
    'Última nota de esta serie.',
    '',
    'Casi siempre llega la misma pregunta:',
    '',
    '"Suena bien… pero ¿cómo pruebo algo sin poner de cabeza lo que ya tengo?"',
    '',
    'Tiene sentido. Nadie quiere apagar la operación un lunes.',
    '',
    'Lo que propongo no es "cambiar todo el lunes". Es mirar una pieza en paralelo — dejar que el sistema calcule unos días mientras tú sigues con tu método actual — y comparar con tus propios ojos.',
    '',
    'Sin presión. Sin llamadas agresivas. Solo curiosidad.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(5, params.leadToken, 'info')
    body += `\n\nSi prefieres ir directo al motor (30 seg):\n${buildMissionActivarUrl(params.leadToken)}`
    body +=
      '\n\nPD: Esta fue la serie completa. Si en algún momento quieres hablar de tu caso concreto, responde a este correo. Si no, no pasa nada — ya hiciste lo más difícil: mirar de frente el reprocesamiento.'
  } else {
    body += `\n\nSolo responde a este correo o entra aquí: ${site}/activar\n\n— Jorge`
  }

  return body
}
