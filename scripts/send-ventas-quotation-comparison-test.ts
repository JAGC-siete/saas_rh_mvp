/**
 * Dry-run: send ventas quotation emails with modality comparison (monthly + annual).
 * Usage: railway run npx tsx scripts/send-ventas-quotation-comparison-test.ts
 */

import { getResendFromContact } from '../lib/resend-from'
import { hardwareFeeMonthly } from '../lib/ventas/modality-includes'
import { roundMoney } from '../lib/ventas/pricing'
import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import {
  generateVentasQuotationEmailHTML,
  generateVentasQuotationEmailSubject,
  generateVentasQuotationEmailText,
} from '../lib/ventas/email-template'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { getVentasBankDetailsFromEnv } from '../lib/ventas/bank-details'
import type { QuotationQuote } from '../lib/ventas/types'

const TEST_EMAIL = 'jorge7gomez@gmail.com'
const SENT_AT = new Date()

function buildSampleQuote(modality: 'monthly' | 'annual'): QuotationQuote {
  const annualTotal = 65000
  const monthlySoftware = roundMoney(annualTotal / 12)
  const hw = hardwareFeeMonthly(2)
  const monthlyHardware = modality === 'monthly' ? hw.fee : 0

  return {
    currency: 'HNL',
    annual_subtotal: 76500,
    annual_discount_amount: 11500,
    annual_total: annualTotal,
    monthly_software_total: monthlySoftware,
    monthly_hardware_fee: monthlyHardware,
    monthly_total: roundMoney(monthlySoftware + monthlyHardware),
    coupon_applied: true,
    discount_pct_applied: 0.45,
    tier: { min_employees: 1, max_employees: 30 },
    billing_modality: modality,
    terminals_count: 2,
  }
}

async function sendQuotationDryRun(params: {
  quote: QuotationQuote
  label: string
  apiKey: string
  fromEmail: string
  bankDetails: ReturnType<typeof getVentasBankDetailsFromEnv>
}) {
  const { quote, label, apiKey, fromEmail, bankDetails } = params
  const contactName = `[DRY RUN] Jorge Test ${label}`
  const companyName = `Empresa Prueba ${label} S.A.`
  const countryLabel = 'Honduras'

  const planSummary = buildQuotationPlanSummary({ quote, sentAt: SENT_AT, now: SENT_AT })
  const pdf = await generateVentasQuotationPDF({
    quote,
    contactEmail: TEST_EMAIL,
    contactName,
    companyName,
    phone: '98765432',
    employeesCount: 25,
    terminalsCount: quote.terminals_count,
    couponCodeSubmitted: 'gastro2026',
    countryLabel,
    sentAt: SENT_AT,
    bankDetails,
  })

  const html = generateVentasQuotationEmailHTML({
    quote,
    contactName,
    companyName,
    countryLabel,
    sentAt: SENT_AT,
    now: SENT_AT,
    bankDetails,
  })
  const text = generateVentasQuotationEmailText({
    quote,
    contactName,
    companyName,
    countryLabel,
    sentAt: SENT_AT,
    now: SENT_AT,
    bankDetails,
  })
  const subject = `[DRY RUN ${label}] ${generateVentasQuotationEmailSubject({
    contactName,
    discountAmount: planSummary.urgency.discountAmount,
    currency: quote.currency,
    urgencyActive: planSummary.urgency.isActive,
  })}`

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const filename = `dry-run-cotizacion-${label.toLowerCase()}-sisu.pdf`

  const result = await resend.emails.send({
    from: fromEmail,
    to: TEST_EMAIL,
    subject,
    html,
    text,
    attachments: [
      {
        filename,
        content: pdf.toString('base64'),
      },
    ],
  })

  if ((result as { error?: { message?: string } })?.error) {
    throw new Error(
      `${label}: ${(result as { error?: { message?: string } }).error?.message || 'send failed'}`
    )
  }

  console.log(`✅ ${label} sent — id=${(result as { id?: string }).id || 'ok'}`)
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is required')
    process.exit(1)
  }

  const fromEmail = getResendFromContact()
  const bankDetails = getVentasBankDetailsFromEnv()

  console.log(`Sending 2 dry-run ventas quotations to ${TEST_EMAIL}...\n`)

  await sendQuotationDryRun({
    quote: buildSampleQuote('monthly'),
    label: 'Mensual',
    apiKey,
    fromEmail,
    bankDetails,
  })

  await sendQuotationDryRun({
    quote: buildSampleQuote('annual'),
    label: 'Anual',
    apiKey,
    fromEmail,
    bankDetails,
  })

  console.log('\nDone. Check inbox for PDF + comparison blocks.')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
