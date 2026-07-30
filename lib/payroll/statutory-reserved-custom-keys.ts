/**
 * Custom field keys that collide with statutory deduction columns (eff_ihss / eff_rap / eff_isr).
 * Values under these keys are mirrors or aliases of legales — never "deducciones adicionales".
 * True manual ISR must use a distinct key (e.g. isr_manual); see manualIsrCustomFieldPresent.
 */
const STATUTORY_RESERVED_CUSTOM_KEYS = new Set(['ihss', 'rap', 'isr'])

export function isStatutoryReservedCustomKey(fieldKey: string): boolean {
  return STATUTORY_RESERVED_CUSTOM_KEYS.has(String(fieldKey || '').toLowerCase())
}
