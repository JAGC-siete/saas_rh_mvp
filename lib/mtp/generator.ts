import type { MTPItem } from './schema'

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function trimTerminalPunctuation(value: string): string {
  return value.replace(/[.;,\s]+$/g, '').trim()
}

function capitalizeFirst(value: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function ensureConnector(value: string, connector: string): string {
  const lowered = value.toLowerCase()
  if (
    lowered.startsWith(`${connector} `) ||
    lowered.startsWith('segun ') ||
    lowered.startsWith('según ') ||
    lowered.startsWith('usando ') ||
    lowered.startsWith('con ') ||
    lowered.startsWith('en ') ||
    lowered.startsWith('al ')
  ) {
    return value
  }
  return `${connector} ${value}`
}

export function generateFinalFunction(row: Pick<MTPItem, 'actionVerb' | 'task' | 'standard' | 'indicator'>): string {
  const actionVerb = trimTerminalPunctuation(cleanText(row.actionVerb))
  const task = trimTerminalPunctuation(cleanText(row.task))
  const standard = trimTerminalPunctuation(cleanText(row.standard))
  const indicator = trimTerminalPunctuation(cleanText(row.indicator))

  const action = trimTerminalPunctuation(`${actionVerb} ${task}`.trim())
  if (!action) return ''

  const segments = [capitalizeFirst(action)]

  if (standard) {
    segments.push(ensureConnector(standard, 'siguiendo'))
  }

  if (indicator) {
    const normalizedIndicator = indicator.toLowerCase().startsWith('para ')
      ? indicator
      : `para ${indicator}`
    segments.push(normalizedIndicator)
  }

  return `${segments.join(' ')}.`
}

export function regenerateMtpItem(row: MTPItem): MTPItem {
  return {
    ...row,
    finalFunction: generateFinalFunction(row)
  }
}
