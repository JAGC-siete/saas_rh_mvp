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

export const SEQUENCE_CONTENT: Record<
  SequenceStep,
  { label: string; subject: string; text: string }
> = {
  [SEQUENCE_STEP.WELCOME]: {
    label: 'Welcome',
    subject: 'Bienvenida: Un nuevo enfoque para tu empresa',
    text: 'Hola, gracias por unirte. A partir de ahora, quiero que veas este espacio como un recurso para modernizar la gestión de tu negocio...',
  },
  [SEQUENCE_STEP.PAIN_POINT_1]: {
    label: 'Pain Point 1',
    subject: '¿Por qué nos da miedo digitalizar?',
    text: 'Hola, muchos gerentes me dicen lo mismo: "Me gustaría automatizar, pero no quiero pasar seis meses implementando un sistema complejo..."',
  },
  [SEQUENCE_STEP.PAIN_POINT_2]: {
    label: 'Pain Point 2',
    subject: 'El peligro de lo "aproximado"',
    text: 'Hola, en la gestión de personas, lo que se mide se mejora; lo que se ignora, se deteriora...',
  },
  [SEQUENCE_STEP.PAIN_POINT_3]: {
    label: 'Pain Point 3',
    subject: 'Del dato muerto al dato vivo',
    text: 'Hola, hay un proceso que sigo viendo en miles de empresas y que es un asesino silencioso de productividad: la memoria USB...',
  },
  [SEQUENCE_STEP.PAIN_POINT_4]: {
    label: 'Pain Point 4',
    subject: 'Cómo empezar a experimentar (sin riesgo)',
    text: 'Hola, después de hablar sobre la resistencia, la medición y la automatización, la pregunta es: ¿Cómo empezar?',
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
