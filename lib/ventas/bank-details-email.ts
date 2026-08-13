import type { VentasBankDetails } from './bank-details'
import { buildBankDetailsInlineHtml } from './bank-details'
import { wrapLiquidEmailFragment } from '../emails/liquid-layout'

export type { VentasBankDetails }
export { getVentasBankDetailsFromEnv } from './bank-details'

export function generateVentasBankDetailsEmailSubject(companyName?: string): string {
  const suffix = companyName?.trim() ? ` — ${companyName.trim()}` : ''
  return `Datos bancarios para continuar${suffix}`
}

export function generateVentasBankDetailsEmailHTML(params: {
  contactName?: string
  companyName?: string
  bank: VentasBankDetails
}) {
  return wrapLiquidEmailFragment(buildBankDetailsInlineHtml(params.bank, params.contactName))
}
