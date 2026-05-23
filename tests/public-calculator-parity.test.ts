import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateIHSS,
  calculateRAP,
  HND_FALLBACK_2025_CONSTANTS
} from '../lib/tax/honduras-tax'
import { computePayrollEmployeeStatutoryDeductions } from '../lib/payroll/statutory-deductions-compute'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

describe('public calculator parity with payroll engine (HND)', () => {
  it('quincenal: factor2Pagos 0.5 devuelve mitad del cálculo mensual (sin segunda división)', async () => {
    const monthlyGross = 20000
    const constants = HND_FALLBACK_2025_CONSTANTS

    const result = await computePayrollEmployeeStatutoryDeductions({
      countryCode: 'HND',
      year: 2025,
      baseMonthlySalary: monthlyGross,
      factor2Pagos: 0.5,
      legalDeductions: { ihss: true, rap: true, isr: false },
      simpleIsrMonthlyBase: monthlyGross,
      useIsrProjection: false,
      hndTaxConstants: constants,
      supabase: {} as never
    })

    const expectedIhss = round2(calculateIHSS(monthlyGross, constants) * 0.5)
    const expectedRap = round2(calculateRAP(monthlyGross, constants) * 0.5)

    assert.equal(result.ihss, expectedIhss)
    assert.equal(result.rap, expectedRap)
  })

  it('mensual: factor2Pagos 1 devuelve deducciones mensuales completas', async () => {
    const monthlyGross = 20000
    const constants = HND_FALLBACK_2025_CONSTANTS

    const result = await computePayrollEmployeeStatutoryDeductions({
      countryCode: 'HND',
      year: 2025,
      baseMonthlySalary: monthlyGross,
      factor2Pagos: 1,
      legalDeductions: { ihss: true, rap: true, isr: false },
      simpleIsrMonthlyBase: monthlyGross,
      useIsrProjection: false,
      hndTaxConstants: constants,
      supabase: {} as never
    })

    assert.equal(result.ihss, round2(calculateIHSS(monthlyGross, constants)))
    assert.equal(result.rap, round2(calculateRAP(monthlyGross, constants)))
  })
})

describe('calculate-deductions API country validation', () => {
  function mockRes() {
    const headers: Record<string, string> = {}
    const res: any = {
      statusCode: 200,
      headersSent: false,
      body: null as unknown,
      setHeader(k: string, v: string) {
        headers[k] = v
      },
      status(code: number) {
        res.statusCode = code
        return res
      },
      json(data: unknown) {
        res.headersSent = true
        res.body = data
        return res
      }
    }
    return { res, headers }
  }

  it('rechaza country_code desconocido con 400', async () => {
    const handler = (await import('../pages/api/public/calculate-deductions')).default as any
    const { res } = mockRes()
    const req: any = {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: {
        salary: 15000,
        paymentModality: 'mensual',
        country_code: 'MEX'
      }
    }

    await handler(req, res)
    assert.equal(res.statusCode, 400)
    assert.match(String((res.body as any)?.error), /Honduras, El Salvador y Guatemala/)
  })
})
