/** Shared helpers for optional-field validation maps (wizard / lead forms). */

export type ValidationErrorMap = Record<string, unknown>

/** True when at least one field has a non-empty error message. */
export function hasValidationErrors(errors: ValidationErrorMap | undefined | null): boolean {
  if (!errors) return false
  return Object.values(errors).some((value) => typeof value === 'string' && value.trim().length > 0)
}

/** Drop one field without leaving `field: undefined` (which still counts in Object.keys). */
export function omitValidationField<T extends ValidationErrorMap>(errors: T, field: keyof T): T {
  const next = { ...errors }
  delete next[field]
  return next
}
