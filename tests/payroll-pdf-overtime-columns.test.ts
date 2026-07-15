/**
 * Planilla PDF columns: orden fijo, labels dinámicos, sin cantidad horas_extras.
 * Run: npx tsx --test tests/payroll-pdf-overtime-columns.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../lib/payroll/report'
import {
  buildPayrollPdfColumnMeta,
  reportBiweeklyBaseFromMonthly,
} from '../lib/payroll/payroll-pdf-columns'
import { getStandardColumns } from '../lib/reports/standard-columns'

function pageCount(pdf: Buffer): number {
  const raw = pdf.toString('latin1')
  const match = raw.match(/\/Count\s+(\d+)/)
  return match ? Number(match[1]) : 0
}

function firstMediaBox(pdf: Buffer): [number, number] | null {
  const raw = pdf.toString('latin1')
  const match = raw.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/)
  if (!match) return null
  return [Number(match[3]) - Number(match[1]), Number(match[4]) - Number(match[2])]
}

const baseFixed = (overrides: Partial<PlanillaItem> = {}): PlanillaItem => ({
  id: 'K02173',
  name: 'Kevin Aguilar',
  bank: 'BANCO',
  bank_account: '123',
  department: 'Ops',
  monthly_salary: 16000,
  days_worked: 15,
  days_absent: 0,
  late_days: 0,
  total_earnings: 9385.83,
  IHSS: 297.58,
  RAP: 30.73,
  ISR: 0,
  total_deductions: 428.31,
  total: 8957.52,
  pay_type: 'fixed',
  ...overrides,
})

describe('payroll PDF column catalog', () => {
  it('orders income then deductions and omits horas_extras quantity', () => {
    const cols = buildPayrollPdfColumnMeta({
      isHourly: false,
      hasSeptimoDia: false,
      hasOvertimePay: true,
      customEarningsWithValues: new Set(['bono_asistencia']),
      legalDeductions: { ihss: true, rap: true, isr: true },
      countryCode: 'HND',
      customFieldsConfig: {
        cooperativa_elga: {
          label: 'Cooperativa Elga',
          type: 'number',
          category: 'deductions',
          required: false,
          default: 0,
        },
        bono_asistencia: {
          label: 'Bono asistencia',
          type: 'number',
          category: 'earnings',
          required: false,
          default: 0,
        },
        horas_extra_manual: {
          label: 'Horas extra',
          type: 'number',
          category: 'earnings',
          required: false,
          default: 0,
        },
      },
    })

    const ids = cols.map((c) => c.id)
    assert.equal(ids.includes('horas_extras'), false)
    assert.equal(ids.includes('custom_horas_extra_manual'), false, 'empty OT alias hidden when Pago HE shows')
    assert.ok(ids.includes('overtime_pay'))
    assert.ok(ids.includes('biweekly_salary'))

    const monthly = ids.indexOf('base_salary')
    const quincenal = ids.indexOf('biweekly_salary')
    const he = ids.indexOf('overtime_pay')
    const customEarn = ids.indexOf('custom_bono_asistencia')
    const gross = ids.indexOf('gross_salary')
    const customDed = ids.indexOf('custom_cooperativa_elga')
    const totalDed = ids.indexOf('total_deductions')
    const net = ids.indexOf('net_salary')

    assert.ok(monthly < quincenal && quincenal < he && he < customEarn && customEarn < gross)
    assert.ok(gross < customDed && customDed < totalDed && totalDed < net)

    assert.equal(cols.find((c) => c.id === 'base_salary')?.header, 'Sueldo Mensual')
    assert.equal(cols.find((c) => c.id === 'biweekly_salary')?.header, 'Sueldo Quincenal')
    assert.equal(cols.find((c) => c.id === 'overtime_pay')?.header, 'Pago HE')
    assert.equal(cols.find((c) => c.id === 'gross_salary')?.header, 'Total ingresos')
    assert.equal(cols.find((c) => c.id === 'net_salary')?.header, 'Neto a Pagar')
  })

  it('never prints horas_extra_manual on planilla PDF (Pago HE only)', () => {
    const cols = buildPayrollPdfColumnMeta({
      isHourly: false,
      hasSeptimoDia: false,
      hasOvertimePay: false,
      customEarningsWithValues: new Set(['horas_extra_manual']),
      customFieldsConfig: {
        horas_extra_manual: {
          label: 'Horas extra',
          type: 'number',
          category: 'earnings',
          required: false,
          default: 0,
        },
      },
      countryCode: 'HND',
    })
    assert.equal(cols.map((c) => c.id).includes('custom_horas_extra_manual'), false)
  })

  it('uses columnLabels overrides', () => {
    const cols = buildPayrollPdfColumnMeta({
      isHourly: false,
      hasSeptimoDia: false,
      hasOvertimePay: true,
      columnLabels: {
        overtime_pay: 'Horas extras pagadas',
        biweekly_salary: 'Base 1ra quincena',
        base_salary: 'Base mensual cfg',
      },
      legalDeductions: { ihss: true, rap: false, isr: false },
      countryCode: 'HND',
    })
    assert.equal(cols.find((c) => c.id === 'overtime_pay')?.header, 'Horas extras pagadas')
    assert.equal(cols.find((c) => c.id === 'biweekly_salary')?.header, 'Base 1ra quincena')
    assert.equal(cols.find((c) => c.id === 'base_salary')?.header, 'Base mensual cfg')
  })

  it('computes biweekly as monthly/2 without overtime', () => {
    assert.equal(reportBiweeklyBaseFromMonthly(16000), 8000)
    assert.equal(reportBiweeklyBaseFromMonthly(16000.5), 8000.25)
  })

  it('standard payroll catalog has biweekly and no horas_extras', () => {
    const std = getStandardColumns('payroll')
    const ids = std.map((c) => c.id)
    assert.ok(ids.includes('biweekly_salary'))
    assert.equal(ids.includes('horas_extras'), false)
    const monthly = std.find((c) => c.id === 'base_salary')!
    const biweekly = std.find((c) => c.id === 'biweekly_salary')!
    const he = std.find((c) => c.id === 'overtime_pay')!
    const gross = std.find((c) => c.id === 'gross_salary')!
    assert.ok(monthly.order < biweekly.order && biweekly.order < he.order && he.order < gross.order)
  })
})

describe('payroll PDF overtime columns', () => {
  it('renders PDF when fixed employees have overtime_pay', async () => {
    const pdf = await generateConsolidatedPayrollPDF(
      [
        baseFixed({
          horas_extras: 16.63,
          overtime_pay: 1385.83,
        }),
      ],
      [],
      '2026-07',
      1,
      undefined,
      'Enlace',
      undefined,
      {
        currency: 'HNL',
        payment_frequency: 'quincenal',
        legal_deductions: { ihss: true, rap: true, isr: false },
        country_code: 'HND',
      },
      { period_start: '2026-07-01', period_end: '2026-07-15' }
    )

    assert.ok(Buffer.isBuffer(pdf))
    assert.ok(pageCount(pdf) >= 2)
    assert.ok(pdf.length > 2000)

    const media = firstMediaBox(pdf)
    assert.ok(media, 'PDF must include MediaBox')
    assert.equal(media![0], 1008, 'page width must be 14 in (1008 pt)')
    assert.equal(media![1], 612, 'page height must be 8.5 in (612 pt)')
  })
})
