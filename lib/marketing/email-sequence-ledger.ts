/**
 * Email sequence ledger — Step 0 (Welcome) + Steps 1–5 (Pain Points).
 * Cold leads: watchman delivers PP1–PP5 on bi-monthly windows (days 12–16 and 26–30).
 * /info leads: welcome +24h, PP1 +48h from registration, then +48h between each PP (daily cron).
 */

import { getMarketingSiteUrl } from './unsubscribe'
import { buildMissionTextFooter } from './mission-config'
import {
  buildInfoPainPoint1Text,
  buildInfoPainPoint2Text,
  buildInfoPainPoint3Text,
  buildInfoPainPoint4Text,
  buildInfoPainPoint5Text,
  buildInfoWelcomeText,
} from './info-field-notes-email'
import {
  buildSuscripcionPainPoint1Text,
  buildSuscripcionPainPoint2Text,
  buildSuscripcionPainPoint3Text,
  buildSuscripcionPainPoint4Text,
  buildSuscripcionPainPoint5Text,
  buildSuscripcionWelcomeText,
} from './suscripcion-field-notes-email'

export const SEQUENCE_STEP = {
  WELCOME: 0,
  PAIN_POINT_1: 1,
  PAIN_POINT_2: 2,
  PAIN_POINT_3: 3,
  PAIN_POINT_4: 4,
  PAIN_POINT_5: 5,
} as const

export type SequenceStep = (typeof SEQUENCE_STEP)[keyof typeof SEQUENCE_STEP]

/** First pain-point step after welcome; watchman only sends steps in [1, 5]. */
export const WATCHMAN_FIRST_STEP = SEQUENCE_STEP.PAIN_POINT_1
export const WATCHMAN_LAST_STEP = SEQUENCE_STEP.PAIN_POINT_5
/** Leads with current_step >= this value have finished the sequence. */
export const SEQUENCE_COMPLETE_STEP = WATCHMAN_LAST_STEP + 1

export type LeadSourceKind = 'suscripcion' | 'info' | 'ventas' | 'activar'

export const WELCOME_GREETINGS: Record<LeadSourceKind, string> = {
  suscripcion: 'Hola, gracias por unirte.',
  info: 'Hola, gracias por tu interés en SISU.',
  ventas: 'Hola, estás más cerca que nunca.',
  activar: 'Hola, tu intuición es acertada.',
}

export const WELCOME_BODY_AFTER_GREETING =
  'La mayoría de los negocios mueren por falta de clientes. Y sucede que se quedan atrapados, limitados mentalmente con el epitafio "la forma en que trabajamos es la mejor".\n\nEl problema no siempre es la economía, sino la creencia de que implementar algo moderno, nuevo o una nueva tecnología es complejo, la curva de aprendizaje alta y arriesgado. Sin embargo la empresa subestima las horas invertidas en procesos manuales propensos a errores que un sistema podría resolver en segundos.\n\nNota mental: No permitir que la inercia del "Siempre lo hemos hecho así" sea la limitante de lo que mi negocio podría llegar a ser.'

const SOURCE_SPECIFICITY: Record<LeadSourceKind, number> = {
  suscripcion: 1,
  info: 1,
  ventas: 2,
  activar: 3,
}

/** Maps raw source strings (API, backfill, landing) to a greeting kind. */
export function normalizeLeadSource(raw?: string | null): LeadSourceKind {
  const s = (raw ?? '').trim().toLowerCase()
  if (!s) return 'suscripcion'
  if (s === 'activar' || s.startsWith('activaciones:') || s.startsWith('activar:')) {
    return 'activar'
  }
  if (s === 'ventas' || s.startsWith('ventas:')) {
    return 'ventas'
  }
  if (s === 'info' || s.startsWith('info:') || s === 'info-page') {
    return 'info'
  }
  return 'suscripcion'
}

export function buildWelcomeText(source?: string | null): string {
  const kind = normalizeLeadSource(source)
  if (kind === 'info') {
    return buildInfoWelcomeText()
  }
  if (kind === 'suscripcion') {
    return buildSuscripcionWelcomeText()
  }
  return `${WELCOME_GREETINGS[kind]}\n\n${WELCOME_BODY_AFTER_GREETING}`
}

/** One-time manual bulk send (Jul 2026): personalized opener, shared body. */
export function buildBulkManualWelcomeText(nombre: string): string {
  const displayName = nombre.trim() || 'Equipo'
  return `Hola ${displayName}, me dejaste en el olvido.\n\n${WELCOME_BODY_AFTER_GREETING}`
}

function sequenceFirstName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

export const PAIN_POINT_1_SUBJECT = 'La trampa de "siempre lo hemos hecho así"'

const PAIN_POINT_1_BODY_CORE = [
  'Hay una frase que funciona como una trampa invisible en los negocios: "Es que siempre lo hemos hecho así".',
  '',
  'A veces creemos que intentar algo nuevo para organizarnos va a ser un dolor de cabeza. Pensamos que va a ser súper difícil de aprender, que va a tomar meses entenderlo y que es mejor no tocar nada para no arruinarlo.',
  '',
  'Pero la verdad es que estamos subestimando cuánto nos cuesta no cambiar.',
  '',
  'El verdadero riesgo no es probar algo nuevo; el riesgo real es seguir perdiendo horas y horas cada semana haciendo a mano cosas (y corrigiendo errores) que una herramienta sencilla podría resolver en un par de segundos.',
  '',
  'Nota mental: No dejemos que la costumbre de hacer las cosas "como siempre" nos quite el tiempo y la energía que nuestro negocio de verdad necesita para crecer.',
].join('\n')

export function buildPainPoint1Text(params?: {
  nombre?: string | null
  email?: string
  source?: string | null
  leadToken?: string | null
}): string {
  if (normalizeLeadSource(params?.source) === 'info') {
    return buildInfoPainPoint1Text(params ?? {})
  }
  if (normalizeLeadSource(params?.source) === 'suscripcion') {
    return buildSuscripcionPainPoint1Text(params ?? {})
  }

  const name = sequenceFirstName(params?.nombre, params?.email)
  let body = `Hola ${name},\n\nHoy quiero contarte por qué a muchos equipos les cuesta tanto dar ese sencillo paso hacia una mejor organización del personal.\n\n${PAIN_POINT_1_BODY_CORE}`

  if (params?.leadToken) {
    body += buildMissionTextFooter(1, params.leadToken)
  } else {
    body += '\n\nEn el próximo correo te contaré sobre un mito gigante que asusta a muchos antes de dar el paso.\n\nUn saludo,\n\nEquipo Humano SISU'
  }

  return body
}

export const PAIN_POINT_2_SUBJECT = 'El mito de los "6 meses de implementación"'

const PAIN_POINT_2_INTRO: Record<LeadSourceKind, string> = {
  info:
    'En el correo anterior te hablé de la trampa del "siempre lo hemos hecho así". Hoy quiero contarte sobre el temor que nos atrapa.',
  suscripcion:
    'En el correo anterior te hablé de la trampa del "siempre lo hemos hecho así". Hoy quiero contarte sobre el temor que nos atrapa.',
  ventas:
    'En el correo anterior te hablé de la trampa del "siempre lo hemos hecho así". Hoy quiero contarte sobre el mito que suele aparecer cuando ya estás cotizando o comparando opciones.',
  activar:
    'En el correo anterior te hablé de la trampa del "siempre lo hemos hecho así". Hoy quiero contarte sobre el miedo que a veces frena el paso final hacia activar tu entorno.',
}

const PAIN_POINT_2_CLOSING_QUESTION: Record<LeadSourceKind, string> = {
  info: 'Entonces, la pregunta no es si tienes tiempo para instalar algo nuevo... la verdadera pregunta es: ¿cuánto tiempo estás perdiendo hoy por temor?',
  suscripcion:
    'Entonces, la pregunta no es si tienes tiempo para instalar algo nuevo... la verdadera pregunta es: ¿cuánto tiempo estás perdiendo hoy por temor?',
  ventas:
    'Entonces, la pregunta no es si tienes tiempo para evaluar algo nuevo... la verdadera pregunta es: ¿cuánto tiempo estás perdiendo hoy por temor, antes incluso de cerrar la cotización?',
  activar:
    'Entonces, la pregunta no es si tienes tiempo para configurar algo nuevo... la verdadera pregunta es: ¿cuánto tiempo estás perdiendo hoy por temor, después de haber decidido que SISU puede servirte?',
}

function buildPainPoint2BodyCore(kind: LeadSourceKind): string {
  return [
    'Seguro has escuchado algo así: "Para que funcione, primero hay que pasar tres meses instalándolo y otros tres meses enseñándole a todos cómo usarlo".',
    '',
    'Eso es exactamente lo que mantiene a muchos negocios atrapados, haciendo las cosas a mano y llenando formatos interminables.',
    '',
    'Pero la realidad es distinta. Si una herramienta es buena, debe devolverte tiempo, en lugar de quitártelo o darte más trabajo.',
    '',
    'Por eso, con SISU nos aseguramos de que empezar a usarlo sea tan natural que ni se siente. No necesitas ser un experto en computadoras, o leyes laborales, para que el sistema empiece a hacer el trabajo pesado por ti en 72 horas o menos.',
    '',
    PAIN_POINT_2_CLOSING_QUESTION[kind],
  ].join('\n')
}

export function buildPainPoint2Text(params?: {
  nombre?: string | null
  email?: string
  source?: string | null
  leadToken?: string | null
}): string {
  if (normalizeLeadSource(params?.source) === 'info') {
    return buildInfoPainPoint2Text(params ?? {})
  }
  if (normalizeLeadSource(params?.source) === 'suscripcion') {
    return buildSuscripcionPainPoint2Text(params ?? {})
  }

  const name = sequenceFirstName(params?.nombre, params?.email)
  const kind = normalizeLeadSource(params?.source)
  const intro = PAIN_POINT_2_INTRO[kind]

  let body = `Hola ${name},\n\n${intro}\n\n${buildPainPoint2BodyCore(kind)}`

  if (params?.leadToken) {
    body += buildMissionTextFooter(2, params.leadToken)
  } else {
    body +=
      '\n\nEn el próximo correo te voy a revelar algo que casi nadie nota: los pequeños errores "invisibles" que ocurren cuando llevamos todo a mano (y que, sin darte cuenta, salen bastante caros).\n\nUn saludo,\n\nEquipo Humano SISU'
  }

  return body
}

export const PAIN_POINT_3_SUBJECT = 'El costo oculto de trabajar "a mano"'

const PAIN_POINT_3_INTRO: Record<LeadSourceKind, string> = {
  info:
    'En el correo anterior te prometí hablar sobre esos errores "invisibles" que ocurren cuando hacemos todo sin un sistema. Hoy quiero contarte por qué salen tan caros.',
  suscripcion:
    'En el correo anterior te prometí hablar sobre esos errores "invisibles" que ocurren cuando hacemos todo sin un sistema. Hoy quiero contarte por qué salen tan caros.',
  ventas:
    'En el correo anterior te prometí hablar sobre esos errores "invisibles" al llevar nómina y asistencia sin un sistema. Hoy quiero contarte por qué salen tan caros cuando estás evaluando una cotización.',
  activar:
    'En el correo anterior te prometí hablar sobre esos errores "invisibles" que ocurren cuando hacemos todo sin un sistema. Hoy quiero contarte por qué salen tan caros, sobre todo justo antes de activar tu entorno.',
}

const PAIN_POINT_3_SISU_LINE: Record<LeadSourceKind, string> = {
  info:
    'Con SISU, cambiamos el "yo creo que todo está bien" por un "tengo el dato exacto y sin errores". El sistema hace las sumas perfectas por ti, para que puedas dormir tranquilo sabiendo que nadie cobró de más, ni de menos.',
  suscripcion:
    'Con SISU, cambiamos el "yo creo que todo está bien" por un "tengo el dato exacto y sin errores". El sistema hace las sumas perfectas por ti, para que puedas dormir tranquilo sabiendo que nadie cobró de más, ni de menos.',
  ventas:
    'Con SISU, cambiamos el "yo creo que todo está bien" por un "tengo el dato exacto y sin errores". El sistema hace las sumas perfectas por ti, para que puedas cotizar y decidir con números claros, sin sorpresas a fin de mes.',
  activar:
    'Con SISU, cambiamos el "yo creo que todo está bien" por un "tengo el dato exacto y sin errores". El sistema hace las sumas perfectas por ti, para que tu primer corte de asistencia o nómina salga bien desde el inicio.',
}

const PAIN_POINT_3_NEXT_TEASER: Record<LeadSourceKind, string> = {
  info:
    'En el próximo correo te voy a contar por qué esas herramientas de computadora que usas todos los días (y que crees que te están ayudando) en realidad te están frenando.',
  suscripcion:
    'En el próximo correo te voy a contar por qué esas herramientas de computadora que usas todos los días (y que crees que te están ayudando) en realidad te están frenando.',
  ventas:
    'En el próximo correo te voy a contar por qué esas hojas de cálculo y carpetas que usas para cotizar y comparar (y que crees que te están ayudando) en realidad te están frenando.',
  activar:
    'En el próximo correo te voy a contar por qué esas herramientas que ya usas en el día a día (y que crees que te están ayudando) en realidad te están frenando al momento de activar algo mejor.',
}

function buildPainPoint3BodyCore(kind: LeadSourceKind): string {
  return [
    'Cuando llevamos los horarios, los permisos y los pagos a mano, o repartidos en mil lugares diferentes, casi siempre se nos escapa algo.',
    '',
    'Unos minutos mal contados, un permiso que se nos olvidó anotar o un cálculo hecho a la carrera. Parecen cosas pequeñas, pero a fin de mes, esos detallitos se convierten en fugas de dinero y en mucho estrés.',
    '',
    'El mayor peligro de llevar las cosas a mano es vivir con la duda constante de si lo hicimos bien.',
    '',
    PAIN_POINT_3_SISU_LINE[kind],
    '',
    'En los negocios, tener esa tranquilidad no debería ser un lujo.',
  ].join('\n')
}

export function buildPainPoint3Text(params?: {
  nombre?: string | null
  email?: string
  source?: string | null
  leadToken?: string | null
}): string {
  if (normalizeLeadSource(params?.source) === 'info') {
    return buildInfoPainPoint3Text(params ?? {})
  }
  if (normalizeLeadSource(params?.source) === 'suscripcion') {
    return buildSuscripcionPainPoint3Text(params ?? {})
  }

  const name = sequenceFirstName(params?.nombre, params?.email)
  const kind = normalizeLeadSource(params?.source)
  const intro = PAIN_POINT_3_INTRO[kind]

  let body = `Hola ${name},\n\n${intro}\n\n${buildPainPoint3BodyCore(kind)}`

  if (params?.leadToken) {
    body += buildMissionTextFooter(3, params.leadToken)
  } else {
    body += `\n\n${PAIN_POINT_3_NEXT_TEASER[kind]}\n\nUn saludo,\n\nEquipo Humano SISU`
  }

  return body
}

export const PAIN_POINT_4_SUBJECT = 'El engaño de la pseudo digitalización'

const PAIN_POINT_4_INTRO: Record<LeadSourceKind, string> = {
  info:
    'En el correo anterior te adelanté algo importante: ese biométrico análogo y esas hojas de excel, en realidad te están frenando.',
  suscripcion:
    'En el correo anterior te adelanté algo importante: ese biométrico análogo y esas hojas de excel, en realidad te están frenando.',
  ventas:
    'En el correo anterior te adelanté algo importante: esas hojas de excel y archivos sueltos con los que armas la cotización, en realidad te están frenando.',
  activar:
    'En el correo anterior te adelanté algo importante: ese biométrico análogo, esas hojas de excel y las herramientas que ya usas, en realidad te están frenando el salto a SISU.',
}

const PAIN_POINT_4_TOOLS_LINE: Record<LeadSourceKind, string> = {
  info:
    'Me refiero a esos Excels infinitos que solo una persona entiende, o a las carpetas compartidas donde nunca encuentras el dato rápido.',
  suscripcion:
    'Me refiero a esos Excels infinitos que solo una persona entiende, o a las carpetas compartidas donde nunca encuentras el dato rápido.',
  ventas:
    'Me refiero a esos Excels infinitos que solo una persona entiende, a las versiones "final_v2" de cada cotización o a las carpetas donde nunca encuentras el dato rápido.',
  activar:
    'Me refiero a esos Excels infinitos que solo una persona entiende, a los reportes del reloj que hay que cruzar a mano o a las carpetas donde nunca encuentras el dato rápido.',
}

const PAIN_POINT_4_SISU_LINE: Record<LeadSourceKind, string> = {
  info:
    'Ahí es donde entra SISU. No lo veas solo como un sistema, velo como un liberador de tiempo. Si sientes que pasas más horas buscando datos que usándolos, es momento de soltar esa carga.',
  suscripcion:
    'Ahí es donde entra SISU. No lo veas solo como un sistema, velo como un liberador de tiempo. Si sientes que pasas más horas buscando datos que usándolos, es momento de soltar esa carga.',
  ventas:
    'Ahí es donde entra SISU. No lo veas solo como un sistema, velo como un liberador de tiempo. Si sientes que pasas más horas armando la cotización que decidiendo con claridad, es momento de soltar esa carga.',
  activar:
    'Ahí es donde entra SISU. No lo veas solo como un sistema, velo como un liberador de tiempo. Si sientes que pasas más horas preparando el cambio que ejecutándolo, es momento de soltar esa carga.',
}

const PAIN_POINT_4_NEXT_TEASER: Record<LeadSourceKind, string> = {
  info:
    'En el próximo (y último) correo de esta serie, te voy a mostrar cómo puedes dar el salto para salir de este enredo, pero haciéndolo paso a paso y sin poner en riesgo tu operación.',
  suscripcion:
    'En el próximo (y último) correo de esta serie, te voy a mostrar cómo puedes dar el salto para salir de este enredo, pero haciéndolo paso a paso y sin poner en riesgo tu operación.',
  ventas:
    'En el próximo (y último) correo de esta serie, te voy a mostrar cómo puedes dar el salto para salir de este enredo y cerrar la decisión, pero haciéndolo paso a paso y sin poner en riesgo tu operación.',
  activar:
    'En el próximo (y último) correo de esta serie, te voy a mostrar cómo puedes activar SISU y salir de este enredo, pero haciéndolo paso a paso y sin poner en riesgo tu operación.',
}

function buildPainPoint4BodyCore(kind: LeadSourceKind): string {
  return [
    'Hay algo que sigo viendo en muchísimos equipos. Siguen usando métodos que fueron pensados para la época del papel, pero ahora metidos en una pantalla.',
    '',
    PAIN_POINT_4_TOOLS_LINE[kind],
    '',
    'Al final, terminas pasando la mayor parte de tu tiempo persiguiendo, cruzando o buscando la información, en lugar de usarla. Eso no es trabajar más rápido, es hacer el trabajo doble.',
    '',
    PAIN_POINT_4_SISU_LINE[kind],
  ].join('\n')
}

export function buildPainPoint4Text(params?: {
  nombre?: string | null
  email?: string
  source?: string | null
  leadToken?: string | null
}): string {
  if (normalizeLeadSource(params?.source) === 'info') {
    return buildInfoPainPoint4Text(params ?? {})
  }
  if (normalizeLeadSource(params?.source) === 'suscripcion') {
    return buildSuscripcionPainPoint4Text(params ?? {})
  }

  const name = sequenceFirstName(params?.nombre, params?.email)
  const kind = normalizeLeadSource(params?.source)
  const intro = PAIN_POINT_4_INTRO[kind]

  let body = `Hola ${name},\n\n${intro}\n\n${buildPainPoint4BodyCore(kind)}`

  if (params?.leadToken) {
    body += buildMissionTextFooter(4, params.leadToken)
  } else {
    body += `\n\n${PAIN_POINT_4_NEXT_TEASER[kind]}\n\nUn saludo,\n\nEquipo Humano SISU`
  }

  return body
}

export const PAIN_POINT_5_SUBJECT = 'Te propongo un trato (donde tú tienes las de ganar)'

const PAIN_POINT_5_INTRO: Record<LeadSourceKind, string> = {
  info:
    'Ayer hablamos de cómo esas tablas infinitas te están robando horas. Hoy, que es el último correo de esta serie, seguro tienes esta duda dando vueltas en la cabeza:',
  suscripcion:
    'Ayer hablamos de cómo esas tablas infinitas te están robando horas. Hoy, que es el último correo de esta serie, seguro tienes esta duda dando vueltas en la cabeza:',
  ventas:
    'Ayer hablamos de cómo esas tablas de cotización te están robando horas. Hoy, que es el último correo de esta serie, seguro tienes esta duda dando vueltas en la cabeza:',
  activar:
    'Ayer hablamos de cómo las herramientas que ya usas te están robando horas antes de activar SISU. Hoy, que es el último correo de esta serie, seguro tienes esta duda dando vueltas en la cabeza:',
}

const PAIN_POINT_5_SHADOW_EXPERIMENT: Record<LeadSourceKind, string> = {
  info:
    'Consiste en hacer un pequeño experimento: empezar con una sola cosa pequeña. Tal vez solo dejar que el sistema calcule los números por unos días, sin que tú tengas que tirar tus papeles o tus Excels todavía. Solo para comparar y que veas la diferencia con tus propios ojos.',
  suscripcion:
    'Consiste en hacer un pequeño experimento: empezar con una sola cosa pequeña. Tal vez solo dejar que el sistema calcule los números por unos días, sin que tú tengas que tirar tus papeles o tus Excels todavía. Solo para comparar y que veas la diferencia con tus propios ojos.',
  ventas:
    'Consiste en hacer un pequeño experimento: empezar con una sola cosa pequeña. Tal vez solo dejar que el sistema calcule los números por unos días, sin que tengas que descartar tus Excels de cotización todavía. Solo para comparar y que veas la diferencia con tus propios ojos.',
  activar:
    'Consiste en hacer un pequeño experimento: empezar con una sola cosa pequeña. Tal vez solo dejar que el sistema calcule los números por unos días, sin que tengas que apagar lo que ya funciona todavía. Solo para comparar y que veas la diferencia con tus propios ojos.',
}

function buildPainPoint5Cta(kind: LeadSourceKind, activarUrl: string): string {
  const ctaByKind: Record<LeadSourceKind, string> = {
    info: `Solo responde a este correo y dime "quiero echar un vistazo", o entra aquí: ${activarUrl} solo para echar un vistazo a cómo se empieza.`,
    suscripcion: `Solo responde a este correo y dime "quiero echar un vistazo", o entra aquí: ${activarUrl} solo para echar un vistazo a cómo se empieza.`,
    ventas: `Solo responde a este correo y dime "quiero echar un vistazo", o entra aquí: ${activarUrl} para ver cómo se empieza sin compromiso de compra.`,
    activar: `Solo responde a este correo y dime "quiero echar un vistazo", o entra aquí: ${activarUrl} para dar el primer paso cuando estés listo.`,
  }
  return ctaByKind[kind]
}

function buildPainPoint5BodyCore(kind: LeadSourceKind): string {
  return [
    '"Todo suena muy bien, pero ¿cómo pruebo algo nuevo sin poner de cabeza el trabajo que ya funciona?"',
    '',
    'Casi todos piensan que usar una herramienta nueva significa borrar todo lo que tienes, detener el negocio y empezar de cero con mucho estrés.',
    '',
    'Pero hay un camino mucho más interesante (y secreto). Yo lo llamo "la prueba en la sombra".',
    '',
    PAIN_POINT_5_SHADOW_EXPERIMENT[kind],
    '',
    'Si te da un poco de curiosidad ver cómo se vería este experimento en tu negocio, sin presiones y sin llamadas intimidantes de ventas...',
  ].join('\n')
}

export function buildPainPoint5Text(params?: {
  nombre?: string | null
  email?: string
  source?: string | null
  leadToken?: string | null
}): string {
  if (normalizeLeadSource(params?.source) === 'info') {
    return buildInfoPainPoint5Text(params ?? {})
  }
  if (normalizeLeadSource(params?.source) === 'suscripcion') {
    return buildSuscripcionPainPoint5Text(params ?? {})
  }

  const name = sequenceFirstName(params?.nombre, params?.email)
  const kind = normalizeLeadSource(params?.source)
  const intro = PAIN_POINT_5_INTRO[kind]

  let body = `Hola ${name},\n\n${intro}\n\n${buildPainPoint5BodyCore(kind)}`

  if (params?.leadToken) {
    body += buildMissionTextFooter(5, params.leadToken)
  } else {
    const site = getMarketingSiteUrl().replace(/\/$/, '')
    body += `\n\n${buildPainPoint5Cta(kind, `${site}/activar`)}\n\nUn saludo,\n\nEquipo Humano SISU`
  }

  return body
}

/** Prefer more specific sources when updating an existing lead (activar > ventas > suscripcion). */
export function isMoreSpecificSource(
  incoming: string | null | undefined,
  existing: string | null | undefined
): boolean {
  const incomingKind = normalizeLeadSource(incoming)
  const existingKind = normalizeLeadSource(existing)
  return SOURCE_SPECIFICITY[incomingKind] > SOURCE_SPECIFICITY[existingKind]
}

export const SEQUENCE_CONTENT: Record<
  SequenceStep,
  { label: string; subject: string; text: string }
> = {
  [SEQUENCE_STEP.WELCOME]: {
    label: 'Welcome',
    subject: 'La trampa de \"siempre lo hemos hecho así\"',
    text: buildWelcomeText('suscripcion'),
  },
  [SEQUENCE_STEP.PAIN_POINT_1]: {
    label: 'Pain Point 1',
    subject: PAIN_POINT_1_SUBJECT,
    text: buildPainPoint1Text(),
  },
  [SEQUENCE_STEP.PAIN_POINT_2]: {
    label: 'Pain Point 2',
    subject: PAIN_POINT_2_SUBJECT,
    text: buildPainPoint2Text(),
  },
  [SEQUENCE_STEP.PAIN_POINT_3]: {
    label: 'Pain Point 3',
    subject: PAIN_POINT_3_SUBJECT,
    text: buildPainPoint3Text(),
  },
  [SEQUENCE_STEP.PAIN_POINT_4]: {
    label: 'Pain Point 4',
    subject: PAIN_POINT_4_SUBJECT,
    text: buildPainPoint4Text(),
  },
  [SEQUENCE_STEP.PAIN_POINT_5]: {
    label: 'Pain Point 5',
    subject: PAIN_POINT_5_SUBJECT,
    text: buildPainPoint5Text(),
  },
}

export type WatchWindow = 'first' | 'second'

/** Bi-monthly watch windows: days 12–16 and 26–30 of each month. */
export function getWatchWindow(date: Date): WatchWindow | null {
  const day = date.getDate()
  if (day >= 12 && day <= 16) return 'first'
  if (day >= 26 && day <= 30) return 'second'
  return null
}

export function getWatchWindowKey(date: Date): string | null {
  const window = getWatchWindow(date)
  if (!window) return null
  return `${date.getFullYear()}-${date.getMonth() + 1}-${window}`
}

export function isBiMonthlyWatchDay(date: Date): boolean {
  return getWatchWindow(date) !== null
}
