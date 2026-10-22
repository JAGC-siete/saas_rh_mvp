import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeLadderQuote,
  FALLBACK_LADDER_PLANS,
  findLadderPlan,
  ladderFirstPaymentTotal,
  ladderNeedsCustomQuote,
  ladderPlanPrices,
  parseLadderPlanKey,
  parseLadderPlans,
  roundPublishedPrice,
} from '../lib/ventas/ladder'
import {
  buildLadderModalityComparison,
  buildLadderPlanSummary,
  ladderIncludesLabels,
  ladderPaymentIntroText,
  ladderTerminalsLabel,
} from '../lib/ventas/ladder-display'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { buildModalityComparison } from '../lib/ventas/modality-comparison'
import { computeFrozenQuoteAmounts } from '../lib/billing/quote-amounts'
import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import { generateVentasQuotationEmailHTML, generateVentasQuotationEmailText } from '../lib/ventas/email-template'

const RULES = { hardware_sale_unit_price: 7500, max_auto_quote_terminals: 5 }
const esencial = findLadderPlan(FALLBACK_LADDER_PLANS, 'basic')
const profesional = findLadderPlan(FALLBACK_LADDER_PLANS, 'pro')
const empresarial = findLadderPlan(FALLBACK_LADDER_PLANS, 'enterprise')

function quote(overrides: Partial<Parameters<typeof computeLadderQuote>[0]> = {}) {
  return computeLadderQuote({
    plan: esencial,
    billingModality: 'monthly',
    terminalsCount: 0,
    employeesCount: 25,
    currency: 'HNL',
    rules: RULES,
    ...overrides,
  })
}

describe('ladder plans', () => {
  it('parses plan keys from internal and public names', () => {
    assert.equal(parseLadderPlanKey('basic'), 'basic')
    assert.equal(parseLadderPlanKey('Profesional'), 'pro')
    assert.equal(parseLadderPlanKey('premium'), 'pro')
    assert.equal(parseLadderPlanKey('empresarial'), 'enterprise')
    assert.equal(parseLadderPlanKey('gold'), null)
  })

  it('falls back per plan when catalog rows are missing or invalid', () => {
    const plans = parseLadderPlans([
      { plan_key: 'basic', name: 'Esencial', monthly_price_hnl: '1400', annual_price_hnl: null },
      { plan_key: 'pro', monthly_price_hnl: 0 },
    ])
    const basic = findLadderPlan(plans, 'basic')
    assert.equal(basic.monthly_price_hnl, 1400)
    assert.equal(basic.annual_price_hnl, 16800)
    assert.equal(findLadderPlan(plans, 'pro').monthly_price_hnl, 3500)
    assert.equal(findLadderPlan(plans, 'enterprise').annual_price_hnl, 80400)
  })

  it('prices by country: HNL list, fixed USD, GTQ converted and rounded to Q 5', () => {
    assert.deepEqual(ladderPlanPrices(esencial, 'HNL'), { monthly: 1300, annual: 15600 })
    assert.deepEqual(ladderPlanPrices(profesional, 'USD'), { monthly: 129, annual: 1548 })
    const gtq = ladderPlanPrices(empresarial, 'GTQ')
    assert.equal(gtq.monthly % 5, 0)
    assert.equal(gtq.annual, gtq.monthly * 12)
    assert.equal(roundPublishedPrice(374.95, 'GTQ'), 375)
    assert.equal(roundPublishedPrice(279.12, 'USD'), 279)
  })

  it('sends more than 300 employees to a custom quote', () => {
    assert.equal(ladderNeedsCustomQuote(300, RULES), false)
    assert.equal(ladderNeedsCustomQuote(301, RULES), true)
  })
})

describe('computeLadderQuote', () => {
  it('monthly Esencial: no clock included, onboarding charged once', () => {
    const q = quote({ terminalsCount: 1 })
    assert.equal(q.pricing_model, 'ladder')
    assert.equal(q.commercial_plan_type, 'basic')
    assert.equal(q.monthly_total, 1300)
    assert.equal(q.annual_total, 15600)
    assert.equal(q.terminals_included_count, 0)
    assert.equal(q.terminals_extra_count, 1)
    assert.equal(q.hardware_sale_total, 7500)
    assert.equal(q.onboarding_fee, 2700)
    assert.equal(ladderFirstPaymentTotal(q), 1300 + 7500 + 2700)
  })

  it('annual includes 1 clock and the onboarding; extras at list price', () => {
    const q = quote({ billingModality: 'annual', terminalsCount: 3 })
    assert.equal(q.terminals_included_count, 1)
    assert.equal(q.terminals_extra_count, 2)
    assert.equal(q.hardware_sale_total, 15000)
    assert.equal(q.onboarding_fee, 0)
    assert.equal(q.hardware_mode, 'included')
    assert.equal(ladderFirstPaymentTotal(q), 15600 + 15000)
  })

  it('Empresarial monthly has no onboarding fee; Profesional maps to premium', () => {
    assert.equal(quote({ plan: empresarial }).onboarding_fee, 0)
    assert.equal(quote({ plan: profesional }).commercial_plan_type, 'premium')
  })

  it('caps terminals at the auto-quote maximum', () => {
    assert.equal(quote({ terminalsCount: 12 }).terminals_count, 5)
  })

  it('El Salvador uses the fixed dollar list and $99 onboarding', () => {
    const q = quote({ currency: 'USD', terminalsCount: 1 })
    assert.equal(q.monthly_total, 49)
    assert.equal(q.onboarding_fee, 99)
    assert.equal(q.hardware_sale_unit_price, Math.round(7500 / 26.87))
  })
})

describe('ladder display', () => {
  it('summary for monthly with clock and onboarding shows the first payment', () => {
    const s = buildQuotationPlanSummary({ quote: quote({ terminalsCount: 1 }) })
    assert.equal(s.tierLabel, 'Plan Esencial · 25 colaboradores')
    assert.deepEqual(
      s.lines.map((l) => l.label),
      ['Plan Esencial · mensual', 'Relojes biométricos (1 × L. 7,500.00)', 'Arranque asistido (pago único)']
    )
    assert.equal(s.totalValue, 'L. 11,500.00')
    assert.match(s.totalLabel, /Luego L\. 1,300\.00 \/ mes, sin permanencia/)
  })

  it('summary for annual without extras is the yearly price', () => {
    const s = buildLadderPlanSummary({ quote: quote({ billingModality: 'annual', terminalsCount: 1 }) })
    assert.equal(s.lines.length, 1)
    assert.equal(s.totalValue, 'L. 15,600.00 / año')
  })

  it('compares against the other modality', () => {
    const monthly = quote({ terminalsCount: 1 })
    const cmp = buildModalityComparison({ quote: monthly })
    assert.ok(cmp)
    assert.equal(cmp!.alternateModality, 'annual')
    assert.equal(cmp!.totalValue, 'L. 15,600.00 / año')
    assert.match(cmp!.footnote, /1 reloj biométrico y el arranque asistido/)

    const annual = buildLadderModalityComparison({ quote: quote({ billingModality: 'annual', terminalsCount: 1 }) })
    assert.match(annual.footnote, /Sin reloj incluido/)
    assert.match(annual.footnote, /arranque asistido se paga una vez/)
  })

  it('labels clocks and includes per modality', () => {
    assert.equal(ladderTerminalsLabel(quote({ billingModality: 'annual', terminalsCount: 2 })), '2 (1 incluido + 1 adicional)')
    assert.equal(ladderTerminalsLabel(quote({ terminalsCount: 2 })), '2 · compra')
    assert.equal(ladderTerminalsLabel(quote()), 'Sin reloj biométrico')
    const labels = ladderIncludesLabels(quote({ plan: profesional, billingModality: 'annual', terminalsCount: 1 }))
    assert.ok(labels.includes('Cesantías y liquidaciones'))
    assert.ok(labels.includes('1 reloj biométrico incluido'))
    assert.ok(labels.includes('Arranque asistido: migración y capacitación incluidas'))
  })

  it('payment text names what the first monthly payment covers', () => {
    assert.match(
      ladderPaymentIntroText(quote({ terminalsCount: 1 })),
      /el primer mes, el reloj y el arranque asistido/
    )
    assert.match(ladderPaymentIntroText(quote({ billingModality: 'annual' })), /^50 %/)
  })
})

describe('ladder billing and documents', () => {
  it('monthly deposit covers month, clocks and onboarding', () => {
    const q = quote({ terminalsCount: 1 })
    const amounts = computeFrozenQuoteAmounts({
      billingModality: 'monthly',
      monthlySoftwareTotal: q.monthly_software_total,
      monthlyHardwareFee: q.monthly_hardware_fee,
      annualTotal: q.annual_total,
      hardwareSaleTotal: q.hardware_sale_total,
      onboardingFee: q.onboarding_fee,
    })
    assert.equal(amounts.expectedDepositHnl, 11500)
  })

  it('email and PDF render for monthly and annual ladder quotes', async () => {
    for (const q of [quote({ terminalsCount: 1 }), quote({ plan: empresarial, billingModality: 'annual', terminalsCount: 2, currency: 'USD' })]) {
      const html = generateVentasQuotationEmailHTML({ quote: q, contactName: 'Ana', companyName: 'Co', countryLabel: 'Honduras' })
      assert.match(html, /Relojes/)
      assert.match(html, /Plan (Esencial|Empresarial)/)
      const text = generateVentasQuotationEmailText({ quote: q, countryLabel: 'Honduras' })
      assert.match(text, /Alcance: Plan (Esencial|Empresarial) · \d+ colaboradores/)
      const pdf = await generateVentasQuotationPDF({
        quote: q,
        contactEmail: 'ana@example.com',
        employeesCount: q.employees_count,
        countryLabel: 'Honduras',
      })
      assert.ok(pdf.length > 1000)
    }
  })
})
