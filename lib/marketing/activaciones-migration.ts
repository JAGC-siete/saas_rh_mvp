/**
 * activaciones → marketing_leads mapping (mirrors SQL 20260606150000).
 */

export const ACTIVACIONES_PENDING_MAX_AGE_DAYS = 30

export type ActivacionStatus =
  | 'pending'
  | 'verified'
  | 'active'
  | 'rejected'
  | 'trial_pending_data'
  | 'trial_live'
  | 'ready_for_conversion'

export type ActivacionMigrationTarget = {
  status: 'active' | 'unsubscribed'
  currentStep: number
  recordLedgerMarker: boolean
}

export function mapActivacionRow(input: {
  status: ActivacionStatus
  createdAt: Date
  now?: Date
}): ActivacionMigrationTarget {
  const now = input.now ?? new Date()
  const maxAgeMs = ACTIVACIONES_PENDING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  const ageMs = now.getTime() - input.createdAt.getTime()

  if (input.status === 'rejected') {
    return { status: 'unsubscribed', currentStep: 5, recordLedgerMarker: false }
  }

  if (input.status === 'pending' || input.status === 'trial_pending_data') {
    if (ageMs <= maxAgeMs) {
      return { status: 'active', currentStep: 1, recordLedgerMarker: true }
    }
    return { status: 'unsubscribed', currentStep: 5, recordLedgerMarker: false }
  }

  return { status: 'active', currentStep: 1, recordLedgerMarker: true }
}
