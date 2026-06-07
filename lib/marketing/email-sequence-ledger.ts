/**
 * Email sequence ledger — Step 0 (Welcome) + Steps 1–4 (Pain Points).
 * Watchman delivers Steps 1–4 on bi-monthly calendar windows (days 12–16 and 26–30).
 */

export const SEQUENCE_STEP = {
  WELCOME: 0,
  PAIN_POINT_1: 1,
  PAIN_POINT_2: 2,
  PAIN_POINT_3: 3,
  PAIN_POINT_4: 4,
} as const

export type SequenceStep = (typeof SEQUENCE_STEP)[keyof typeof SEQUENCE_STEP]

/** First pain-point step after welcome; watchman only sends steps in [1, 4]. */
export const WATCHMAN_FIRST_STEP = SEQUENCE_STEP.PAIN_POINT_1
export const WATCHMAN_LAST_STEP = SEQUENCE_STEP.PAIN_POINT_4
/** Leads with current_step >= this value have finished the sequence. */
export const SEQUENCE_COMPLETE_STEP = WATCHMAN_LAST_STEP + 1

export type LeadSourceKind = 'suscripcion' | 'ventas' | 'activar'

export const WELCOME_GREETINGS: Record<LeadSourceKind, string> = {
  suscripcion: 'Hola, gracias por unirte.',
  ventas: 'Hola, estás más cerca que nunca.',
  activar: 'Hola, tu intuición es acertada.',
}

export const WELCOME_BODY_AFTER_GREETING =
  'La mayoría de los negocios mueren por falta de clientes. Y sucede que se quedan atrapados, limitados mentalmente con el epitafio "la forma en que trabajamos es la mejor".\n\nEl problema no siempre es la economía, sino la creencia de que implementar algo moderno, nuevo o una nueva tecnología es complejo, la curva de aprendizaje alta y arriesgado. Sin embargo la empresa subestima las horas invertidas en procesos manuales propensos a errores que un sistema podría resolver en segundos.\n\nNota mental: No permitir que la inercia del "Siempre lo hemos hecho así" sea la limitante de lo que mi negocio podría llegar a ser.'

const SOURCE_SPECIFICITY: Record<LeadSourceKind, number> = {
  suscripcion: 1,
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
  return 'suscripcion'
}

export function buildWelcomeText(source?: string | null): string {
  const kind = normalizeLeadSource(source)
  return `${WELCOME_GREETINGS[kind]}\n\n${WELCOME_BODY_AFTER_GREETING}`
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
    subject: 'El mito de los \"6 meses de implementación\"',
    text: 'Hola.\n\nHablemos de la mentira más común en el software empresarial: \"Para que esto funcione, primero tenemos que pasar tres meses configurándolo y otros tres entrenando al personal\".\n\nEse es el miedo que mantiene a la mayoría de los negocios atrapados en procesos manuales. Creen que para ganar eficiencia primero deben aceptar un caos operativo.\n\nPero aquí está la verdad: si un sistema requiere que detengas tu negocio para poder implementarlo, entonces el sistema está mal diseñado. La verdadera innovación no es la que te pide tiempo, sino la que te lo devuelve desde el primer día.\n\nEn Humano SISU diseñamos la herramienta para que la curva de aprendizaje sea casi invisible. No se trata de cambiar cómo trabajás, sino de eliminar las tareas repetitivas que te roban la energía para hacer crecer tu empresa.\n\nLa pregunta no es si tenés tiempo para implementar un sistema, sino cuánto tiempo estás perdiendo hoy por no tener uno.',
  },
  [SEQUENCE_STEP.PAIN_POINT_2]: {
    label: 'Pain Point 2',
    subject: 'El costo real de gestionar \"a mano\"',
    text: 'Hola.\n\nEn la gestión de personas, hay una regla implacable: lo que se mide se mejora, y lo que se ignora, se deteriora.\n\nLa mayoría de las empresas operan bajo el peligro de gestionar todo a mano. Confían en que la memoria del encargado de nómina es perfecta o que el registro de asistencia es \"suficientemente bueno\". \n\nEl problema es que los errores invisibles son los más caros. Un error de cálculo en una prestación, un descuido en el control de horas extras o una falla en el registro de asistencia no se notan hoy, pero explotan en el futuro en forma de demandas laborales, multas gubernamentales o un clima laboral tóxico.\n\nGestionar la operación basándose en la intuición y el papel es jugar a la ruleta rusa con la rentabilidad de tu negocio.\n\nSisu elimina la incertidumbre. Transformamos el \"yo creo que todo está bien\" en \"tengo el dato exacto en tiempo real\". Porque en los negocios, la precisión no es un lujo, es la única forma de dormir tranquilo.',
  },
  [SEQUENCE_STEP.PAIN_POINT_3]: {
    label: 'Pain Point 3',
    subject: 'Tus herramientas actuales te están frenando',
    text: 'Hola.\n\nHay un proceso que sigo viendo en miles de empresas y que es un asesino silencioso de productividad: el uso de herramientas que fueron diseñadas para la era del papel, pero que hoy solo viven en una pantalla.\n\nMe refiero a esos Excels infinitos, carpetas compartidas que nadie encuentra y el eterno \"estoy revisando el archivo\" que tarda dos horas en llegar a tu escritorio.\n\nEl problema no es que la herramienta no funcione; el problema es que se ha vuelto un ancla. Te obliga a gastar el 80% de tu tiempo en coordinar el dato y solo el 20% en tomar decisiones con ese dato.\n\nSisu no es solo un software de gestión, es un liberador de tiempo. Al centralizar la información y automatizar el flujo, eliminamos el ruido administrativo para que podás enfocarte en lo que realmente mueve la aguja de tu negocio.\n\nSi sentís que pasás más tiempo buscando información que gestionándola, es momento de soltar el ancla.',
  },
  [SEQUENCE_STEP.PAIN_POINT_4]: {
    label: 'El Salto al Control Real',
    subject: '¿Cómo empezar a experimentar (sin riesgo)?',
    text: 'Hola.\n\nDespués de hablar sobre el miedo a la implementación, el peligro de gestionar a mano y el lastre de las herramientas obsoletas, queda una sola pregunta: ¿Cómo se sale de ahí sin poner en riesgo la operación?\n\nLa mayoría cree que el salto debe ser total y traumático: apagar todo y encender un sistema nuevo. Ese es el camino al fracaso.\n\nLa forma correcta es la experimentación controlada. Empezar con un módulo, validar que el dato es exacto, sentir la liberación de tiempo y luego expandir.\n\nSisu fue diseñado precisamente para este camino. No te pedimos que confíes ciegamente en una promesa, sino que veas la precisión de la herramienta en tu propio negocio.\n\nSi ya te cansaste de luchar contra la fricción administrativa y querés que tu gestión sea tan moderna como el servicio que ofrecés a tus clientes, es momento de dar el paso.\n\nEscribime al privado o activá tu solución en www.humanosisu.net/activar. Hagamos que la gestión de tu personal deje de ser un dolor de cabeza y se convierta en tu ventaja competitiva.',
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
