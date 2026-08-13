import { infoMissionPublicPath } from './info-funnel-path'
import { getMarketingSiteUrl } from './unsubscribe'
import { SEQUENCE_STEP } from './email-sequence-ledger'

/** Post-cotización /ventas leads use commercial closing mission copy. */
function isVentasMissionAudience(source?: string | null): boolean {
  const s = (source ?? '').trim().toLowerCase()
  return s === 'ventas' || s.startsWith('ventas:')
}

/** Trial /activar leads use onboarding-focused mission copy. */
function isActivarMissionAudience(source?: string | null): boolean {
  const s = (source ?? '').trim().toLowerCase()
  return s === 'activar' || s.startsWith('activaciones:') || s.startsWith('activar:')
}

/** Suscripcion-style leads (newsletter / calculadoras) use employee-focused mission copy. */
function isSuscripcionMissionAudience(source?: string | null): boolean {
  const s = (source ?? '').trim().toLowerCase()
  if (s === 'info' || s.startsWith('info:') || s === 'info-page') return false
  if (s === 'viernes' || s.startsWith('viernes:')) return false
  if (s === 'activar' || s.startsWith('activaciones:') || s.startsWith('activar:')) return false
  if (s === 'ventas' || s.startsWith('ventas:')) return false
  return true
}

export const MISSION_IDS = [1, 2, 3, 4, 5] as const
export type MissionId = (typeof MISSION_IDS)[number]

export type MissionChoiceDef = {
  id: string
  label: string
}

export type MissionDef = {
  id: MissionId
  badge: string
  stepLabel: string
  question: string
  choices: MissionChoiceDef[]
}

export const MISSIONS: Record<MissionId, MissionDef> = {
  1: {
    id: 1,
    badge: 'Clave #1',
    stepLabel: 'Inercia',
    question: '¿Cuántas horas al mes crees que se te van en lo repetitivo — firmas, cruces, correcciones?',
    choices: [
      { id: '0-5', label: '0 a 5 horas' },
      { id: '5-15', label: '5 a 15 horas' },
      { id: '15plus', label: 'Más de 15 horas' },
    ],
  },
  2: {
    id: 2,
    badge: 'Clave #2',
    stepLabel: 'Complejidad',
    question: '¿Qué es lo que más te frena cuando piensas en automatizar algo?',
    choices: [
      { id: 'difficult', label: 'Que sea muy difícil' },
      { id: 'expensive', label: 'Que sea muy caro' },
      { id: 'control', label: 'Perder el control / algo legal' },
    ],
  },
  3: {
    id: 3,
    badge: 'Clave #3',
    stepLabel: 'Costo oculto',
    question: '¿Dónde sientes que hoy se te escapa más el tiempo?',
    choices: [
      { id: 'attendance', label: 'Firmas y asistencia' },
      { id: 'payroll', label: 'Cálculos de planilla' },
      { id: 'permissions', label: 'Permisos y vacaciones' },
    ],
  },
  4: {
    id: 4,
    badge: 'Clave #4',
    stepLabel: 'Pseudo digitalización',
    question: 'Se honesto: ¿Tu Excel actual tiene errores que rezas porque nadie descubra?',
    choices: [
      { id: 'yes-bomb', label: 'Sí, es una bomba de tiempo' },
      { id: 'trust-blind', label: 'No, confío ciegamente' },
    ],
  },
  5: {
    id: 5,
    badge: 'Clave #5',
    stepLabel: 'Prueba en la sombra',
    question: '¿Te interesa ver cómo sería esa prueba en la sombra?',
    choices: [{ id: 'shadow', label: 'Sí, muéstrame' }],
  },
}

/** Employee-focused missions for /suscripcion leads (calculator audience). */
export const SUSCRIPCION_MISSIONS: Record<MissionId, MissionDef> = {
  1: {
    id: 1,
    badge: 'Nota #1',
    stepLabel: 'Recibo vs cálculo',
    question: '¿Alguna vez tu recibo no cuadró con lo que esperabas?',
    choices: [
      { id: 'yes-often', label: 'Sí, más de una vez' },
      { id: 'yes-once', label: 'Sí, alguna vez' },
      { id: 'never', label: 'No, siempre cuadra' },
    ],
  },
  2: {
    id: 2,
    badge: 'Nota #2',
    stepLabel: 'Deducciones',
    question: '¿Entendés para qué va cada descuento en tu recibo?',
    choices: [
      { id: 'yes-clear', label: 'Sí, más o menos' },
      { id: 'some', label: 'Algunos, no todos' },
      { id: 'no-idea', label: 'Honestamente, no' },
    ],
  },
  3: {
    id: 3,
    badge: 'Nota #3',
    stepLabel: 'Fechas legales',
    question: '¿Sabés cuándo te corresponde el aguinaldo / catorceavo?',
    choices: [
      { id: 'yes', label: 'Sí, tengo claro' },
      { id: 'approx', label: 'Más o menos' },
      { id: 'no', label: 'No estoy seguro/a' },
    ],
  },
  4: {
    id: 4,
    badge: 'Nota #4',
    stepLabel: 'Si no cuadra',
    question: 'Si los números no coinciden, ¿qué harías primero?',
    choices: [
      { id: 'ask-hr', label: 'Preguntar en RRHH' },
      { id: 'recalc', label: 'Volver a calcular yo/a' },
      { id: 'stay-quiet', label: 'Dejarlo así' },
    ],
  },
  5: {
    id: 5,
    badge: 'Nota #5',
    stepLabel: 'Alertas',
    question: '¿Te interesa seguir recibiendo alertas legales sobre tu sueldo?',
    choices: [
      { id: 'yes-alerts', label: 'Sí, avisame' },
      { id: 'maybe', label: 'Tal vez' },
    ],
  },
}

export const ACTIVAR_MISSIONS: Record<MissionId, MissionDef> = {
  1: {
    id: 1,
    badge: 'Nota #1',
    stepLabel: 'Tiempo',
    question: '¿Qué te llevó más tiempo el mes pasado — cruzar datos o calcular?',
    choices: [
      { id: 'cross-data', label: 'Cruzar / mover datos' },
      { id: 'calc-deductions', label: 'Calcular deducciones' },
      { id: 'both-equal', label: 'Las dos por igual' },
    ],
  },
  2: {
    id: 2,
    badge: 'Nota #2',
    stepLabel: 'Primer login',
    question: '¿Entraste al entorno de prueba al menos una vez?',
    choices: [
      { id: 'yes-once', label: 'Sí, al menos una vez' },
      { id: 'plan-to', label: 'Todavía no, planifico' },
      { id: 'no-time', label: 'No, no encontré tiempo' },
    ],
  },
  3: {
    id: 3,
    badge: 'Nota #3',
    stepLabel: 'Fuga de tiempo',
    question: '¿Dónde sentís que se escapa más tiempo hoy — asistencia o planilla?',
    choices: [
      { id: 'attendance', label: 'Asistencia' },
      { id: 'payroll', label: 'Planilla' },
      { id: 'both', label: 'Las dos' },
    ],
  },
  4: {
    id: 4,
    badge: 'Nota #4',
    stepLabel: 'Confianza',
    question: '¿Tu Excel actual te da tranquilidad o duda a fin de mes?',
    choices: [
      { id: 'calm', label: 'Tranquilidad' },
      { id: 'doubt', label: 'Duda' },
      { id: 'depends', label: 'Depende del mes' },
    ],
  },
  5: {
    id: 5,
    badge: 'Nota #5',
    stepLabel: 'Tu operación',
    question: '¿Te interesa ver cómo se vería con tus números reales?',
    choices: [
      { id: 'yes-real', label: 'Sí, quiero verlo' },
      { id: 'maybe', label: 'Tal vez' },
      { id: 'not-yet', label: 'Aún no' },
    ],
  },
}

export const VENTAS_MISSIONS: Record<MissionId, MissionDef> = {
  1: {
    id: 1,
    badge: 'Nota #1',
    stepLabel: 'Aprobación',
    question: '¿Quién aprueba esta inversión además de usted?',
    choices: [
      { id: 'just-me', label: 'Solo yo / gerencia directa' },
      { id: 'partner', label: 'Socio o director' },
      { id: 'board', label: 'Comité o junta' },
    ],
  },
  2: {
    id: 2,
    badge: 'Nota #2',
    stepLabel: 'Modalidad',
    question: '¿Prefiere arrancar anual o mensual?',
    choices: [
      { id: 'annual', label: 'Anual' },
      { id: 'monthly', label: 'Mensual' },
      { id: 'undecided', label: 'Aún lo evalúo' },
    ],
  },
  3: {
    id: 3,
    badge: 'Nota #3',
    stepLabel: 'Plazo',
    question: '¿Cuándo necesita tener la primera planilla en el sistema?',
    choices: [
      { id: 'this-month', label: 'Este mes' },
      { id: 'next-month', label: 'Próximo mes' },
      { id: 'exploring', label: 'Solo explorando' },
    ],
  },
  4: {
    id: 4,
    badge: 'Nota #4',
    stepLabel: 'Revisión PDF',
    question: '¿Ya revisó el PDF con su equipo?',
    choices: [
      { id: 'yes-team', label: 'Sí, con el equipo' },
      { id: 'solo', label: 'Solo yo por ahora' },
      { id: 'not-yet', label: 'Todavía no' },
    ],
  },
  5: {
    id: 5,
    badge: 'Nota #5',
    stepLabel: 'Contratación',
    question: '¿Desea que le enviemos datos bancarios para reservar la oferta?',
    choices: [
      { id: 'yes-bank', label: 'Sí, envíen datos' },
      { id: 'whatsapp', label: 'Prefiero WhatsApp' },
      { id: 'not-yet', label: 'Aún no' },
    ],
  },
}

export function getMissionDef(missionId: MissionId, source?: string | null): MissionDef {
  if (isVentasMissionAudience(source)) {
    return VENTAS_MISSIONS[missionId]
  }
  if (isActivarMissionAudience(source)) {
    return ACTIVAR_MISSIONS[missionId]
  }
  if (isSuscripcionMissionAudience(source)) {
    return SUSCRIPCION_MISSIONS[missionId]
  }
  return MISSIONS[missionId]
}

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === 'number' && MISSION_IDS.includes(value as MissionId)
}

export function parseMissionId(raw: string | string[] | undefined): MissionId | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  return isMissionId(n) ? n : null
}

export function isValidMissionChoice(
  missionId: MissionId,
  choice: string,
  source?: string | null
): boolean {
  return getMissionDef(missionId, source).choices.some((c) => c.id === choice)
}

export function sequenceStepToMissionId(step: number): MissionId | null {
  if (step === SEQUENCE_STEP.PAIN_POINT_1) return 1
  if (step === SEQUENCE_STEP.PAIN_POINT_2) return 2
  if (step === SEQUENCE_STEP.PAIN_POINT_3) return 3
  if (step === SEQUENCE_STEP.PAIN_POINT_4) return 4
  if (step === SEQUENCE_STEP.PAIN_POINT_5) return 5
  return null
}

export function buildMissionPageUrl(missionId: MissionId, leadToken: string, choiceId: string): string {
  const site = getMarketingSiteUrl().replace(/\/$/, '')
  const params = new URLSearchParams({ lead: leadToken, choice: choiceId })
  return `${site}${infoMissionPublicPath(missionId)}?${params.toString()}`
}

export function buildMissionActivarUrl(leadToken: string): string {
  const site = getMarketingSiteUrl().replace(/\/$/, '')
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'mission',
    utm_campaign: 'm5_shadow',
    source: 'm5',
    lead: leadToken,
  })
  return `${site}/activar?${params.toString()}`
}

/** Header above mission choices in plain-text sequence emails. */
export function buildMissionFooterHeader(mission: MissionDef, source?: string | null): string {
  const prompt = isVentasMissionAudience(source)
    ? 'Respuesta rápida (1 clic)'
    : 'Pregunta rápida (1 clic)'
  return `${mission.badge} · ${prompt}`
}

/** Removes mission question + choice links (+ trailing sign-off) before HTML rendering. */
export function stripMissionTextFooter(text: string): string {
  return text
    .replace(
      /\n\n?(?:(?:(?:Nota|Clave) #\d · )?(?:Campo · )?(?:Pregunta rápida|Respuesta rápida)[^\n]*\n[\s\S]*?\n\n— Jorge)/,
      ''
    )
    .trim()
}

/** Avoid duplicating the HTML sign-off when plain text already ends with — Jorge. */
export function stripTrailingSignOff(text: string): string {
  return text.replace(/\n\n— Jorge\s*$/, '').trim()
}

export function buildMissionTextFooter(
  missionId: MissionId,
  leadToken: string,
  source?: string | null
): string {
  const mission = getMissionDef(missionId, source)
  const lines = [buildMissionFooterHeader(mission, source), '', mission.question, '']

  for (const choice of mission.choices) {
    lines.push(`→ ${choice.label}`)
    lines.push(buildMissionPageUrl(missionId, leadToken, choice.id))
    lines.push('')
  }

  lines.push('— Jorge')
  return `\n\n${lines.join('\n')}`
}
