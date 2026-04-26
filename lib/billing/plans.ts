/**
 * Commercial plan types stored in `companies.plan_type` and exposed in the admin UI.
 * The DB has a CHECK constraint mirroring this list (see migration
 * 20260418090000_plan_catalog_align_free_trial_basic.sql).
 */
export const COMMERCIAL_PLAN_TYPES = ['trial', 'basic', 'premium', 'enterprise'] as const
export type CommercialPlanType = (typeof COMMERCIAL_PLAN_TYPES)[number]

/** Internal plan keys used in `plan_catalog` / `plan_features`. */
export const INTERNAL_PLAN_KEYS = ['free_trial', 'basic', 'pro', 'enterprise'] as const
export type InternalPlanKey = (typeof INTERNAL_PLAN_KEYS)[number]

/**
 * Mapping from commercial plan_type (as seen by the customer-facing side of the
 * product) to the internal plan_key (used by the RBAC/feature-flag layer).
 * Must stay in sync with `app_private.has_feature`.
 */
export const COMMERCIAL_TO_INTERNAL: Record<CommercialPlanType, InternalPlanKey> = {
  trial: 'free_trial',
  basic: 'basic',
  premium: 'pro',
  enterprise: 'enterprise',
}

export const COMMERCIAL_PLAN_LABELS: Record<CommercialPlanType, string> = {
  trial: 'Trial',
  basic: 'Basic',
  premium: 'Premium',
  enterprise: 'Enterprise',
}

/** The single "non-paid" commercial plan. Everything else is considered paid. */
export const TRIAL_PLAN_TYPE: CommercialPlanType = 'trial'

/**
 * Paid commercial plans = every COMMERCIAL_PLAN_TYPE that is not the trial.
 * Derived at build time so adding a new plan only requires updating the master list.
 */
export const PAID_PLAN_TYPES: readonly CommercialPlanType[] = COMMERCIAL_PLAN_TYPES.filter(
  (p) => p !== TRIAL_PLAN_TYPE
)

export function isPaidPlanType(v: unknown): v is CommercialPlanType {
  const normalized = normalizePlanType(v)
  return !!normalized && (PAID_PLAN_TYPES as readonly string[]).includes(normalized)
}

export function isCommercialPlanType(v: unknown): v is CommercialPlanType {
  return typeof v === 'string' && (COMMERCIAL_PLAN_TYPES as readonly string[]).includes(v)
}

export function normalizePlanType(v: unknown): CommercialPlanType | null {
  if (typeof v !== 'string') return null
  const lowered = v.trim().toLowerCase()
  return isCommercialPlanType(lowered) ? lowered : null
}

export function toInternalPlanKey(v: unknown): InternalPlanKey {
  const commercial = normalizePlanType(v) ?? 'basic'
  return COMMERCIAL_TO_INTERNAL[commercial]
}
