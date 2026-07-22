/**
 * Dry-run: exact AGROSALVA snapshot (985bb3dc) localized SLV→USD → jorge7gomez@gmail.com
 * Usage: railway run npx tsx scripts/send-ventas-agrosalva-dry-run.ts
 */

import { getResendFromContact } from '../lib/resend-from'
import { hardwareFeeMonthly } from '../lib/ventas/modality-includes'
import {
  shouldChargeHardwareContinuity,
  shouldChargeHardwareSale,
  hardwareSaleTotal,
} from '../lib/ventas/business-rules'
import { roundMoney } from '../lib/ventas/pricing'
import {
  convertVentasMoney,
  localizeQuotationQuote,
  VENTAS_PRICE_LIST_CURRENCY,
} from '../lib/ventas/currency'
import { currencyForCountryCode } from '../lib/country/supported'
import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import {
  generateVentasQuotationEmailHTML,
  generateVentasQuotationEmailSubject,
  generateVentasQuotationEmailText,
} from '../lib/ventas/email-template'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { getVentasBankDetailsFromEnv } from '../lib/ventas/bank-details'
import type { QuotationQuote } from '../lib/ventas/types'

const TEST_EMAIL = process.env.VENTAS_RESEND_TO?.trim() || 'jorge7gomez@gmail.com'
const CONTACT_NAME = 'David Ponce'
const COMPANY_NAME = 'AGROSALVA, S.A. DE C.V.'
const PHONE = '77452329'
const EMPLOYEES_COUNT = 85
const TERMINALS_COUNT = 1
const BILLING_MODALITY: 'annual' | 'monthly' = 'annual'
const COUNTRY_CODE = 'SLV' as const
const COUNTRY_LABEL = 'El Salvador'
/** Snapshot from cotizaciones 985bb3dc (auxiliarrh@agrosalva.com). */
const LIST_ANNUAL_TOTAL = 57420
const TIER = { min_employees: 71, max_employees: 90 }

function buildQuoteFromSnapshot(): QuotationQuote {
  const listCurrency = VENTAS_PRICE_LIST_CURRENCY
  const annualSubtotal = LIST_ANNUAL_TOTAL
  const annualDiscountAmount = 0
  const annualTotal = LIST_ANNUAL_TOTAL
  const monthlySoftwareTotal = roundMoney(annualTotal / 12)
  const hw = hardwareFeeMonthly(TERMINALS_COUNT)
  const monthlyHardwareFeeList = shouldChargeHardwareContinuity(BILLING_MODALITY, EMPLOYEES_COUNT)
    ? hw.fee
    : 0
  const monthlyHardwareFee = convertVentasMoney(
    monthlyHardwareFeeList,
    VENTAS_PRICE_LIST_CURRENCY,
    listCurrency
  )
  const sale = shouldChargeHardwareSale(BILLING_MODALITY, EMPLOYEES_COUNT)
    ? hardwareSaleTotal(TERMINALS_COUNT)
    : null
  const monthlyTotal = roundMoney(monthlySoftwareTotal + monthlyHardwareFee)

  const quoteList: QuotationQuote = {
    currency: listCurrency,
    annual_subtotal: annualSubtotal,
    annual_discount_amount: annualDiscountAmount,
    annual_total: annualTotal,
    monthly_software_total: monthlySoftwareTotal,
    monthly_hardware_fee: monthlyHardwareFee,
    monthly_total: monthlyTotal,
    hardware_sale_total: sale
      ? convertVentasMoney(sale.total, VENTAS_PRICE_LIST_CURRENCY, listCurrency)
      : 0,
    hardware_sale_unit_price: sale
      ? convertVentasMoney(sale.unitPrice, VENTAS_PRICE_LIST_CURRENCY, listCurrency)
      : undefined,
    hardware_sale_discount_pct: sale?.discountPct,
    coupon_applied: false,
    discount_pct_applied: 0,
    coupon_code_applied: null,
    tier: TIER,
    billing_modality: BILLING_MODALITY,
    terminals_count: TERMINALS_COUNT,
    employees_count: EMPLOYEES_COUNT,
  }

  return localizeQuotationQuote(quoteList, listCurrency, currencyForCountryCode(COUNTRY_CODE))
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is required')
    process.exit(1)
  }

  const fromEmail = getResendFromContact()
  const bankDetails = getVentasBankDetailsFromEnv()
  const sentAt = new Date()
  const quote = buildQuoteFromSnapshot()
  const planSummary = buildQuotationPlanSummary({ quote, sentAt, now: sentAt })

  const pdf = await generateVentasQuotationPDF({
    quote,
    contactEmail: 'auxiliarrh@agrosalva.com',
    contactName: CONTACT_NAME,
    companyName: COMPANY_NAME,
    phone: PHONE,
    employeesCount: EMPLOYEES_COUNT,
    terminalsCount: TERMINALS_COUNT,
    countryLabel: COUNTRY_LABEL,
    sentAt,
    bankDetails,
  })

  const html = generateVentasQuotationEmailHTML({
    quote,
    contactName: CONTACT_NAME,
    companyName: COMPANY_NAME,
    countryLabel: COUNTRY_LABEL,
    sentAt,
    now: sentAt,
    bankDetails,
  })
  const text = generateVentasQuotationEmailText({
    quote,
    contactName: CONTACT_NAME,
    companyName: COMPANY_NAME,
    countryLabel: COUNTRY_LABEL,
    sentAt,
    now: sentAt,
    bankDetails,
  })
  const isDryRun = TEST_EMAIL.toLowerCase() !== 'auxiliarrh@agrosalva.com'
  const baseSubject = generateVentasQuotationEmailSubject({
    contactName: CONTACT_NAME,
    companyName: COMPANY_NAME,
  })
  const subject = isDryRun ? `[DRY RUN · AGROSALVA snapshot SLV→USD] ${baseSubject}` : baseSubject

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const filename = 'dry-run-cotizacion-agrosalva-sisu.pdf'

  console.log('Sending dry-run AGROSALVA snapshot:')
  console.log(`  original: auxiliarrh@agrosalva.com / 985bb3dc`)
  console.log(`  to: ${TEST_EMAIL}`)
  console.log(`  country: ${COUNTRY_LABEL} → ${quote.currency}`)
  console.log(`  list HNL ${LIST_ANNUAL_TOTAL} → ${quote.currency} ${quote.annual_total.toFixed(2)}`)
  console.log(`  plan total: ${planSummary.totalLabel} = ${planSummary.totalValue}\n`)

  const result = await resend.emails.send({
    from: fromEmail,
    to: TEST_EMAIL,
    subject,
    html,
    text,
    attachments: [{ filename, content: pdf.toString('base64') }],
  })

  if ((result as { error?: { message?: string } })?.error) {
    throw new Error((result as { error?: { message?: string } }).error?.message || 'send failed')
  }

  console.log(`Sent — id=${(result as { data?: { id?: string } }).data?.id || (result as { id?: string }).id || 'ok'}`)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
