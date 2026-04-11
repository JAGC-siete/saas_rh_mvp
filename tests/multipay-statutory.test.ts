import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

import { statutoryJsonToHndTaxConstants } from '../lib/tax/statutory-config'
import {
  calculateIHSS,
  calculateISR,
  calculateRAP,
  HND_FALLBACK_2025_CONSTANTS
} from '../lib/tax/honduras-tax'
import { calculateSlvMonthlyIsrUsd, normalizeSlvMonthlyBrackets } from '../lib/tax/slv-isr'
import { calculateGtmMonthlyIsrFromAnnualConfig } from '../lib/tax/gtm-isr'
import { parseStatutoryConfigForPayroll } from '../lib/tax/statutory-config-validate'
import { StatutoryConfigInvalidError, StatutoryParamsMissingError } from '../lib/tax/statutory-payroll-errors'
import {
  loadStatutoryConfigExact,
  computePayrollEmployeeStatutoryDeductions
} from '../lib/payroll/statutory-deductions-compute'

const jsonPath = path.join(process.cwd(), 'lib/tax/hnd-fallback-2025.json')
const hndFallbackRaw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as {
  minimum_wage: number
  ihss_ceiling: number
  ihss_employee_rate: number
  rap_rate: number
  medical_deduction_limit?: number
  isr_brackets: Array<{ limit: number; rate: number; base: number; lower: number }>
}

describe('multipay statutory (HND)', () => {
  it('exported HND_FALLBACK_2025_CONSTANTS matches hnd-fallback-2025.json', () => {
    assert.equal(HND_FALLBACK_2025_CONSTANTS.minimum_wage, hndFallbackRaw.minimum_wage)
    assert.equal(HND_FALLBACK_2025_CONSTANTS.ihss_ceiling, hndFallbackRaw.ihss_ceiling)
    assert.equal(HND_FALLBACK_2025_CONSTANTS.isr_brackets.length, hndFallbackRaw.isr_brackets.length)
    const last = HND_FALLBACK_2025_CONSTANTS.isr_brackets[HND_FALLBACK_2025_CONSTANTS.isr_brackets.length - 1]
    assert.equal(last.limit, Infinity)
  })

  it('parses engine HND payload (statutory-config)', () => {
    const c = statutoryJsonToHndTaxConstants({
      engine: 'HND',
      minimum_wage: 11903.13,
      ihss_ceiling: 11903.13,
      ihss_employee_rate: 0.05,
      rap_rate: 0.015,
      isr_brackets: [{ limit: 999999999, rate: 0.1, base: 0, lower: 0 }]
    })
    assert.ok(c)
    assert.equal(c!.ihss_employee_rate, 0.05)
    assert.equal(c!.isr_brackets[0].limit, Infinity)
  })

  it('numeric regression IHSS/RAP/ISR via honduras-tax + JSON constants', () => {
    const c = HND_FALLBACK_2025_CONSTANTS
    const gross = 20000
    const ihss = Math.round(calculateIHSS(gross, c) * 100) / 100
    const rap = Math.round(calculateRAP(gross, c) * 100) / 100
    const isr = Math.round(calculateISR(gross, c.isr_brackets) * 100) / 100
    assert.equal(ihss, 595.16)
    assert.equal(rap, 121.45)
    assert.equal(isr, 0)
    const isr2 = Math.round(calculateISR(25000, c.isr_brackets) * 100) / 100
    assert.equal(isr2, 531.34)
  })
})

describe('SLV ISR (lib/tax/slv-isr.ts)', () => {
  const seedBrackets = normalizeSlvMonthlyBrackets([
    { from: 0, to: 550, rate: 0, fixed: 0 },
    { from: 550.01, to: 895.24, rate: 0.1, fixed: 17.67 },
    { from: 895.25, to: 2038.1, rate: 0.2, fixed: 60 },
    { from: 2038.11, to: null, rate: 0.3, fixed: 288.57 }
  ])

  it('700 USD taxable → 32.67 (mismo módulo que nómina)', () => {
    const v = Math.round(calculateSlvMonthlyIsrUsd(700, seedBrackets) * 100) / 100
    assert.equal(v, 32.67)
  })
})

describe('GTM ISR (lib/tax/gtm-isr.ts)', () => {
  const cfg = {
    up_to: 300000,
    rate: 0.05,
    over: { fixed: 15000, rate: 0.07 }
  }

  it('10_000 GTQ/mes → 500 mensual (modelo anual del seed)', () => {
    const v = Math.round(calculateGtmMonthlyIsrFromAnnualConfig(10000, cfg) * 100) / 100
    assert.equal(v, 500)
  })
})

describe('statutory_config Zod (SLV/GTM)', () => {
  it('acepta payload SLV v2 alineado a seed 2026', () => {
    const raw = {
      schemaVersion: 2,
      engine: 'SLV',
      isss: { employeeRate: 0.03, employerRate: 0.075, monthlyCeiling: 1000 },
      afp: { employeeRate: 0.0725, employerRate: 0.0875 },
      insafrop: { employerRate: 0.01, minEmployees: 10 },
      isr_monthly_brackets_usd: [{ from: 0, to: 550, rate: 0, fixed: 0 }]
    }
    const p = parseStatutoryConfigForPayroll('SLV', raw)
    assert.equal((p.isss as { employeeRate: number }).employeeRate, 0.03)
  })

  it('rechaza engine distinto al país', () => {
    assert.throws(
      () =>
        parseStatutoryConfigForPayroll('SLV', {
          schemaVersion: 2,
          engine: 'GTM',
          isss: { employeeRate: 0.03, monthlyCeiling: 1 },
          afp: { employeeRate: 0.07 },
          isr_monthly_brackets_usd: []
        }),
      StatutoryConfigInvalidError
    )
  })

  it('rechaza SLV v2 inválido (tipos)', () => {
    assert.throws(
      () =>
        parseStatutoryConfigForPayroll('SLV', {
          schemaVersion: 2,
          engine: 'SLV',
          isss: { employeeRate: 'nope', monthlyCeiling: 1000 },
          afp: { employeeRate: 0.07 },
          isr_monthly_brackets_usd: []
        } as unknown as Record<string, unknown>),
      StatutoryConfigInvalidError
    )
  })
})

function supabaseChainMaybeSingle(result: { data: unknown; error: unknown }) {
  const tail = {
    maybeSingle: async () => result
  }
  const eq3 = {
    eq: () => tail
  }
  const eq2 = {
    eq: () => eq3
  }
  const eq1 = {
    eq: () => eq2
  }
  return {
    from: () => ({
      select: () => eq1
    })
  }
}

describe('loadStatutoryConfigExact + compute SLV', () => {
  it('sin fila exacta: compute lanza StatutoryParamsMissingError', async () => {
    const mockSb = supabaseChainMaybeSingle({ data: null, error: null })
    const row = await loadStatutoryConfigExact('SLV', 2099, mockSb as never)
    assert.equal(row, null)
    await assert.rejects(
      () =>
        computePayrollEmployeeStatutoryDeductions({
          countryCode: 'SLV',
          year: 2099,
          baseMonthlySalary: 1000,
          factor2Pagos: 1,
          legalDeductions: { ihss: true, rap: false, isr: false },
          simpleIsrMonthlyBase: 1000,
          useIsrProjection: false,
          supabase: mockSb
        }),
      (e: unknown) => e instanceof StatutoryParamsMissingError
    )
  })

  it('con fila válida v1 (placeholder): compute no lanza por validación', async () => {
    const cfg = {
      schemaVersion: 1,
      engine: 'SLV',
      currency: 'USD',
      isss: { employeeRate: 0.03, monthlyCeiling: 1000 },
      afp: { employeeRate: 0.0725 },
      insafrop: { employerRate: 0.01, minEmployees: 10 },
      isr_brackets: [],
      disclaimer: 'test'
    }
    const mockSb = supabaseChainMaybeSingle({
      data: { statutory_config: cfg },
      error: null
    })
    const out = await computePayrollEmployeeStatutoryDeductions({
      countryCode: 'SLV',
      year: 2026,
      baseMonthlySalary: 1000,
      factor2Pagos: 1,
      legalDeductions: { ihss: true, rap: false, isr: false },
      simpleIsrMonthlyBase: 1000,
      useIsrProjection: false,
      supabase: mockSb
    })
    assert.ok(out.ihss > 0)
  })
})
