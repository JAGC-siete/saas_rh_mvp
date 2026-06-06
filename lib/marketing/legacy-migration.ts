/**
 * P2 legacy → marketing_leads mapping (mirrors SQL migration 20260606130000).
 * Used for tests and documentation; production backfill runs in SQL only (no emails).
 */

export const LEGACY_PENDING_MAX_AGE_DAYS = 30

export type LegacyMailStatus = 'pending' | 'confirmed' | 'unsubscribed'

export type LegacyMigrationTarget = {
  status: 'active' | 'unsubscribed'
  currentStep: number
  recordLedgerMarker: boolean
  p2TargetStatus: string
}

/** Maps one legacy row to marketing_leads fields (no side effects). */
export function mapLegacyMailListRow(input: {
  status: LegacyMailStatus
  createdAt: Date
  now?: Date
}): LegacyMigrationTarget {
  const now = input.now ?? new Date()
  const ageMs = now.getTime() - input.createdAt.getTime()
  const maxAgeMs = LEGACY_PENDING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000

  if (input.status === 'confirmed') {
    return {
      status: 'active',
      currentStep: 1,
      recordLedgerMarker: true,
      p2TargetStatus: 'active',
    }
  }

  if (input.status === 'pending') {
    if (ageMs <= maxAgeMs) {
      return {
        status: 'active',
        currentStep: 1,
        recordLedgerMarker: true,
        p2TargetStatus: 'active',
      }
    }
    return {
      status: 'unsubscribed',
      currentStep: 5,
      recordLedgerMarker: false,
      p2TargetStatus: 'unsubscribed_stale',
    }
  }

  return {
    status: 'unsubscribed',
    currentStep: 5,
    recordLedgerMarker: false,
    p2TargetStatus: 'unsubscribed',
  }
}
