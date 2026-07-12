/**
 * Dry-run: send one ventas quotation email (no DB / no trial activation).
 * Usage: railway run npx tsx scripts/send-ventas-quotation-dry-run.ts
 */

import { getResendFromContact } from '../lib/resend-from'
import { hardwareFeeMonthly } from '../lib/ventas/modality-includes'
import { shouldChargeHardwareContinuity } from '../lib/ventas/business-rules'
import {
  normalizeCouponCode,
  resolveTierByEmployees,
  roundMoney,
} from '../lib/ventas/pricing'
import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import {
  generateVentasQuotationEmailHTML,
  generateVentasQuotationEmailSubject,
  generateVentasQuotationEmailText,
} from '../lib/ventas/email-template'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { getVentasBankDetailsFromEnv } from '../lib/ventas/bank-details'
import type { QuotationQuote, VentasPricingTier } from '../lib/ventas/types'

const TEST_EMAIL = 'jorge7gomez@gmail.com'
const CONTACT_NAME = '[DRY RUN] Jorge Test'
const COMPANY_NAME = 'Tacostadi'
const EMPLOYEES_COUNT = 10
const TERMINALS_COUNT = 1
const BILLING_MODALITY: 'annual' | 'monthly' = 'annual'
const COUPON_SUBMITTED = 'aghas'
const SECTOR_RUBRO = 'restaurante'
const COUNTRY_LABEL = 'Honduras'

const FALLBACK_COUPON_CODE = 'gastro2026'
const FALLBACK_COUPON_DISCOUNT_PCT = 0.45
const FALLBACK_TIERS: VentasPricingTier[] = [
  { min_employees: 1, max_employees: 30, price: 65000, is_active: true, sort_order: 10 },
  { min_employees: 31, max_employees: 50, price: 74000, is_active: true, sort_order: 20 },
  { min_employees: 51, max_employees: 100, price: 85000, is_active: true, sort_order: 30 },
  { min_employees: 101, max_employees: 200, price: 97450, is_active: true, sort_order: 40 },
]

function buildQuote(): QuotationQuote {
  const tier = resolveTierByEmployees(FALLBACK_TIERS, EMPLOYEES_COUNT)
  if (!tier) throw new Error('No pricing tier for employee count')

  const couponSubmittedNorm = normalizeCouponCode(COUPON_SUBMITTED)
  const couponCode = normalizeCouponCode(FALLBACK_COUPON_CODE)
  const isCouponValid = !!couponSubmittedNorm && couponSubmittedNorm === couponCode
  const discountPctApplied = isCouponValid ? FALLBACK_COUPON_DISCOUNT_PCT : 0

  const annualSubtotal = roundMoney(Number(tier.price))
  const annualDiscountAmount = roundMoney(annualSubtotal * discountPctApplied)
  const annualTotal = roundMoney(annualSubtotal - annualDiscountAmount)
  const monthlySoftwareTotal = roundMoney(annualTotal / 12)
  const hw = hardwareFeeMonthly(TERMINALS_COUNT)
  const monthlyHardwareFee = shouldChargeHardwareContinuity(BILLING_MODALITY, EMPLOYEES_COUNT)
    ? hw.fee
    : 0
  const monthlyTotal = roundMoney(monthlySoftwareTotal + monthlyHardwareFee)

  return {
    currency: 'HNL',
    annual_subtotal: annualSubtotal,
    annual_discount_amount: annualDiscountAmount,
    annual_total: annualTotal,
    monthly_software_total: monthlySoftwareTotal,
    monthly_hardware_fee: monthlyHardwareFee,
    monthly_total: monthlyTotal,
    coupon_applied: isCouponValid,
    discount_pct_applied: discountPctApplied,
    tier: { min_employees: tier.min_employees, max_employees: tier.max_employees },
    billing_modality: BILLING_MODALITY,
    terminals_count: TERMINALS_COUNT,
    employees_count: EMPLOYEES_COUNT,
  }
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
  const quote = buildQuote()
  const planSummary = buildQuotationPlanSummary({ quote, sentAt, now: sentAt })

  const pdf = await generateVentasQuotationPDF({
    quote,
    contactEmail: TEST_EMAIL,
    contactName: CONTACT_NAME,
    companyName: COMPANY_NAME,
    phone: '+50432226773',
    employeesCount: EMPLOYEES_COUNT,
    terminalsCount: TERMINALS_COUNT,
    couponCodeSubmitted: COUPON_SUBMITTED,
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
  const subject = `[DRY RUN] ${generateVentasQuotationEmailSubject({
    contactName: CONTACT_NAME,
    companyName: COMPANY_NAME,
  })}`

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const filename = 'dry-run-cotizacion-tacostadi-sisu.pdf'

  console.log('Sending dry-run ventas quotation:')
  console.log(`  to: ${TEST_EMAIL}`)
  console.log(`  company: ${COMPANY_NAME} (${SECTOR_RUBRO})`)
  console.log(`  employees: ${EMPLOYEES_COUNT}`)
  console.log(`  coupon submitted: ${COUPON_SUBMITTED} → applied: ${quote.coupon_applied}`)
  console.log(`  annual total: L. ${quote.annual_total.toFixed(2)}\n`)

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

  console.log(`✅ Sent — id=${(result as { id?: string }).id || 'ok'}`)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
