import type { CountryCode } from '../country/supported'
import { logger } from '../logger'
import { maskEmail } from '../privacy'
import { enrollMarketingLead } from './enroll-lead'

export function marketingSourceForDeductionCalculator(countryCode?: CountryCode | string): string {
  const cc = (countryCode || 'HND').toString().toLowerCase()
  return `calculadora-deducciones-${cc}`
}

export function marketingSourceForPrestacionesCalculator(): string {
  return 'calculadora-prestaciones'
}

/** Enroll after PDF send succeeds; non-blocking (same pattern as /activar). */
export function enrollPublicToolLeadNonBlocking(email: string, source: string): void {
  void enrollMarketingLead({
    email: email.trim().toLowerCase(),
    source,
  })
    .then((result) => {
      logger.info('Public tool lead enrolled in marketing', {
        email: maskEmail(email),
        source,
        leadId: result.leadId,
        welcomeSent: result.welcomeSent,
        skippedReason: result.skippedReason,
      })
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.warn('Marketing enroll failed for public tool lead (non-blocking)', {
        email: maskEmail(email),
        source,
        error: message,
      })
    })
}
