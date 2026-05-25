import type { VentasBankDetails } from './bank-details'
import { buildBankDetailsInlineHtml } from './bank-details'

function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

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
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      ${buildBankDetailsInlineHtml(params.bank, params.contactName)}
    </div>
  `
}
