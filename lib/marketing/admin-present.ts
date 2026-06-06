import { SEQUENCE_COMPLETE_STEP } from './email-sequence-ledger'

export type MarketingLeadStatus = 'active' | 'completed' | 'unsubscribed'

export const MARKETING_STATUS_LABELS: Record<MarketingLeadStatus, string> = {
  active: 'Activo',
  completed: 'Completado',
  unsubscribed: 'Desuscrito',
}

export function marketingStepLabel(currentStep: number): string {
  if (currentStep <= 0) return 'Welcome pendiente'
  if (currentStep >= SEQUENCE_COMPLETE_STEP) return 'Secuencia completa'
  return `Siguiente: paso ${currentStep}`
}

export function marketingStepShort(currentStep: number): string {
  if (currentStep <= 0) return '0'
  if (currentStep >= SEQUENCE_COMPLETE_STEP) return '✓'
  return String(currentStep)
}
