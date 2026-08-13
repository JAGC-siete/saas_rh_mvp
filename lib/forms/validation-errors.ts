/** Shared helpers for optional-field validation maps (wizard / lead forms). */

/** True when at least one field has a non-empty error message. */
export function hasValidationErrors(errors: object | undefined | null): boolean {
  if (!errors) return false
  return Object.values(errors as Record<string, unknown>).some(
    (value) => typeof value === 'string' && value.trim().length > 0
  )
}

/** Drop one field without leaving `field: undefined` (which still counts in Object.keys). */
export function omitValidationField<T extends object>(errors: T, field: keyof T): T {
  const next = { ...errors } as T & Record<string, unknown>
  delete next[field as string]
  return next
}
