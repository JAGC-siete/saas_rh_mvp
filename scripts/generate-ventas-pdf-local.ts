/**
 * Local PDF only — loads live config_ventas from Supabase (same as /api/quote).
 * Usage: railway run npx tsx scripts/generate-ventas-pdf-local.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { createAdminClient } from '../lib/supabase/server'
import { hardwareFeeMonthly } from '../lib/ventas/modality-includes'
import { resolveTierByEmployees, roundMoney } from '../lib/ventas/pricing'
import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import { getVentasBankDetailsFromEnv } from '../lib/ventas/bank-details'
import { loadActiveVentasConfig, resolveSubmittedPromo } from '../lib/ventas/load-ventas-config'

const OUT_PATH = 'tmp/dry-run-cotizacion-tacostado.pdf'
const EMPLOYEES_COUNT = 9
const COUPON_SUBMITTED = 'aghas'
const COMPANY_NAME = 'Restaurante Tacostado'
const BILLING_MODALITY: 'annual' | 'monthly' = 'annual'
const TERMINALS_COUNT = 1

async function main() {
  const supabase = createAdminClient()
  const { configRow, currency, tiers, promoCodes } = await loadActiveVentasConfig(supabase as any)
  const tier = resolveTierByEmployees(tiers, EMPLOYEES_COUNT)
  if (!tier) throw new Error(`No pricing tier for ${EMPLOYEES_COUNT} employees`)

  const promo = resolveSubmittedPromo({ promoCodes, submittedRaw: COUPON_SUBMITTED })
  const annualSubtotal = roundMoney(Number(tier.price))
  const annualDiscountAmount = roundMoney(annualSubtotal * promo.discountPctApplied)
  const annualTotal = roundMoney(annualSubtotal - annualDiscountAmount)
  const monthlySoftwareTotal = roundMoney(annualTotal / 12)
  const hw = hardwareFeeMonthly(TERMINALS_COUNT)
  const monthlyHardwareFee = BILLING_MODALITY === 'monthly' ? hw.fee : 0
  const monthlyTotal = roundMoney(monthlySoftwareTotal + monthlyHardwareFee)

  const quote = {
    currency,
    annual_subtotal: annualSubtotal,
    annual_discount_amount: annualDiscountAmount,
    annual_total: annualTotal,
    monthly_software_total: monthlySoftwareTotal,
    monthly_hardware_fee: monthlyHardwareFee,
    monthly_total: monthlyTotal,
    coupon_applied: promo.isCouponValid,
    discount_pct_applied: promo.discountPctApplied,
    coupon_code_applied: promo.couponCodeApplied,
    tier: { min_employees: tier.min_employees, max_employees: tier.max_employees },
    billing_modality: BILLING_MODALITY,
    terminals_count: TERMINALS_COUNT,
  }

  const sentAt = new Date()
  const pdf = await generateVentasQuotationPDF({
    quote,
    contactEmail: 'jorge7gomez@gmail.com',
    contactName: '[DRY RUN] Jorge Test',
    companyName: COMPANY_NAME,
    phone: '+50432226773',
    employeesCount: EMPLOYEES_COUNT,
    terminalsCount: TERMINALS_COUNT,
    couponCodeSubmitted: COUPON_SUBMITTED,
    countryLabel: 'Honduras',
    sentAt,
    bankDetails: getVentasBankDetailsFromEnv(),
  })

  mkdirSync('tmp', { recursive: true })
  writeFileSync(OUT_PATH, pdf)

  console.log('=== Live config_ventas (active) ===')
  console.log(`  id: ${configRow?.id ?? 'fallback'}`)
  console.log(`  promo codes: ${promoCodes.map((p) => p.code).join(', ') || 'legacy'}`)
  console.log(`  tier for ${EMPLOYEES_COUNT} employees: ${tier.min_employees}–${tier.max_employees} @ ${tier.price}`)
  console.log('')
  console.log('=== Quote dry-run ===')
  console.log(`  coupon submitted: ${COUPON_SUBMITTED}`)
  console.log(`  coupon applied: ${promo.isCouponValid} (${promo.couponCodeApplied ?? 'n/a'})`)
  console.log(`  subtotal: ${annualSubtotal}`)
  console.log(`  discount: ${annualDiscountAmount}`)
  console.log(`  annual total: ${annualTotal}`)
  console.log('')
  console.log(`Saved: ${OUT_PATH} (${pdf.length} bytes)`)
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
