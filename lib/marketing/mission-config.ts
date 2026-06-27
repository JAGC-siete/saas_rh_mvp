import { INFO_FUNNEL_PUBLIC_PATH, infoMissionPublicPath } from './info-funnel-path'
import { getMarketingSiteUrl } from './unsubscribe'
import { SEQUENCE_STEP } from './email-sequence-ledger'

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
    badge: 'Misión 1 de 5',
    stepLabel: 'Inercia',
    question: '¿Cuántas horas calculas que pierdes al mes en tareas repetitivas?',
    choices: [
      { id: '0-5', label: '0 a 5 horas' },
      { id: '5-15', label: '5 a 15 horas' },
      { id: '15plus', label: '¡Más de 15 horas!' },
    ],
  },
  2: {
    id: 2,
    badge: 'Misión 2 de 5',
    stepLabel: 'Complejidad',
    question: '¿Qué te da más miedo de automatizar?',
    choices: [
      { id: 'difficult', label: 'Que sea muy difícil' },
      { id: 'expensive', label: 'Que sea muy caro' },
      { id: 'control', label: 'Perder el control legal' },
    ],
  },
  3: {
    id: 3,
    badge: 'Misión 3 de 5',
    stepLabel: 'Costo oculto',
    question: '¿Dónde sientes que se te escapa más el tiempo hoy?',
    choices: [
      { id: 'attendance', label: 'Firmas y Asistencia' },
      { id: 'payroll', label: 'Cálculos de Planilla' },
      { id: 'permissions', label: 'Permisos y Vacaciones' },
    ],
  },
  4: {
    id: 4,
    badge: 'Misión 4 de 5',
    stepLabel: 'Pseudo digitalización',
    question: 'Se honesto: ¿Tu Excel actual tiene errores que rezas porque nadie descubra?',
    choices: [
      { id: 'yes-bomb', label: 'Sí, es una bomba de tiempo' },
      { id: 'trust-blind', label: 'No, confío ciegamente' },
    ],
  },
  5: {
    id: 5,
    badge: 'Misión final',
    stepLabel: 'Prueba en la sombra',
    question: '¿Listo para ver el experimento sin riesgo?',
    choices: [{ id: 'shadow', label: 'Iniciar la prueba en la sombra' }],
  },
}

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === 'number' && MISSION_IDS.includes(value as MissionId)
}

export function parseMissionId(raw: string | string[] | undefined): MissionId | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  return isMissionId(n) ? n : null
}

export function isValidMissionChoice(missionId: MissionId, choice: string): boolean {
  return MISSIONS[missionId].choices.some((c) => c.id === choice)
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

export function buildMissionTextFooter(missionId: MissionId, leadToken: string): string {
  const mission = MISSIONS[missionId]
  const lines = ['', '🕹️ Tu misión (1 clic):', mission.question, '']

  for (const choice of mission.choices) {
    lines.push(`→ ${choice.label}: ${buildMissionPageUrl(missionId, leadToken, choice.id)}`)
  }

  lines.push('', '— Jorge · Humano SISU')
  return lines.join('\n')
}
