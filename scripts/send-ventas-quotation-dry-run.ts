/**
 * Dry-run: send one ventas quotation email (no DB / no trial activation).
 * Usage: railway run npx tsx scripts/send-ventas-quotation-dry-run.ts
 */

import { getResendFromContact } from '../lib/resend-from'
import { createAdminClient } from '../lib/supabase/server'
import { hardwareFeeMonthly } from '../lib/ventas/modality-includes'
import {
  hardwareSaleTotal,
  shouldChargeHardwareContinuity,
  shouldChargeHardwareSale,
} from '../lib/ventas/business-rules'
import { resolveTierByEmployees, roundMoney } from '../lib/ventas/pricing'
import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import {
  generateVentasQuotationEmailHTML,
  generateVentasQuotationEmailSubject,
  generateVentasQuotationEmailText,
} from '../lib/ventas/email-template'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { getVentasBankDetailsFromEnv } from '../lib/ventas/bank-details'
import { loadActiveVentasConfig, resolveSubmittedPromo } from '../lib/ventas/load-ventas-config'
import type { QuotationQuote } from '../lib/ventas/types'

const TEST_EMAIL = 'jorge7gomez@gmail.com'
const CONTACT_NAME = 'Jorge'
const COMPANY_NAME = 'Grupo Sin Frontera'
const EMPLOYEES_COUNT = 14
const TERMINALS_COUNT = 1
const BILLING_MODALITY: 'annual' | 'monthly' = 'annual'
const COUPON_SUBMITTED = ''
const SECTOR_RUBRO = 'servicios'
const COUNTRY_LABEL = 'Honduras'

async function buildQuote(): Promise<QuotationQuote> {
  const supabase = createAdminClient()
  const { currency, tiers, promoCodes } = await loadActiveVentasConfig(supabase as any)
  const tier = resolveTierByEmployees(tiers, EMPLOYEES_COUNT)
  if (!tier) throw new Error(`No pricing tier for ${EMPLOYEES_COUNT} employees`)

  const promo = resolveSubmittedPromo({ promoCodes, submittedRaw: COUPON_SUBMITTED })
  const annualSubtotal = roundMoney(Number(tier.price))
  const annualDiscountAmount = roundMoney(annualSubtotal * promo.discountPctApplied)
  const annualTotal = roundMoney(annualSubtotal - annualDiscountAmount)
  const monthlySoftwareTotal = roundMoney(annualTotal / 12)
  const hw = hardwareFeeMonthly(TERMINALS_COUNT)
  const monthlyHardwareFee = shouldChargeHardwareContinuity(BILLING_MODALITY, EMPLOYEES_COUNT)
    ? hw.fee
    : 0
  const sale = shouldChargeHardwareSale(BILLING_MODALITY, EMPLOYEES_COUNT)
    ? hardwareSaleTotal(TERMINALS_COUNT)
    : null
  const monthlyTotal = roundMoney(monthlySoftwareTotal + monthlyHardwareFee)

  return {
    currency,
    annual_subtotal: annualSubtotal,
    annual_discount_amount: annualDiscountAmount,
    annual_total: annualTotal,
    monthly_software_total: monthlySoftwareTotal,
    monthly_hardware_fee: monthlyHardwareFee,
    monthly_total: monthlyTotal,
    hardware_sale_total: sale?.total ?? 0,
    hardware_sale_unit_price: sale?.unitPrice,
    hardware_sale_discount_pct: sale?.discountPct,
    coupon_applied: promo.isCouponValid,
    discount_pct_applied: promo.discountPctApplied,
    coupon_code_applied: promo.couponCodeApplied,
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
  const quote = await buildQuote()
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
  const filename = 'dry-run-cotizacion-grupo-sin-frontera-sisu.pdf'

  console.log('Sending dry-run ventas quotation:')
  console.log(`  to: ${TEST_EMAIL}`)
  console.log(`  company: ${COMPANY_NAME} (${SECTOR_RUBRO})`)
  console.log(`  modality: ${BILLING_MODALITY}`)
  console.log(`  employees: ${EMPLOYEES_COUNT} → tier ${quote.tier.min_employees}–${quote.tier.max_employees}`)
  console.log(`  terminals: ${TERMINALS_COUNT}`)
  console.log(`  hardware fee / mes: L. ${quote.monthly_hardware_fee.toFixed(2)}`)
  console.log(`  hardware sale: L. ${quote.hardware_sale_total.toFixed(2)}`)
  console.log(`  annual total: L. ${quote.annual_total.toFixed(2)}`)
  console.log(`  plan total: ${planSummary.totalLabel} = ${planSummary.totalValue}`)
  console.log(`  coupon applied: ${quote.coupon_applied}\n`)

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
