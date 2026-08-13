/**
 * Daily OT breakdown builder + receipt page 2.
 * Run: npx tsx --test tests/overtime-daily-breakdown.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildOvertimeDailyBreakdownSheet,
  buildOvertimeDailyRow,
  dayNameFromIsoDate,
  hourlyRateFromMonthly,
} from '../lib/payroll/overtime-daily-breakdown'
import { generateEmployeeReceiptPDF } from '../lib/payroll/receipt'

function pageCount(pdf: Buffer): number {
  const raw = pdf.toString('latin1')
  const match = raw.match(/\/Count\s+(\d+)/)
  return match ? Number(match[1]) : 0
}

describe('hourlyRateFromMonthly', () => {
  it('uses 240 labor factor', () => {
    assert.equal(hourlyRateFromMonthly(16500), 68.75)
    assert.equal(hourlyRateFromMonthly(24000), 100)
  })
})

describe('dayNameFromIsoDate', () => {
  it('returns Spanish weekday for ISO date', () => {
    // 2026-06-16 is Tuesday
    assert.equal(dayNameFromIsoDate('2026-06-16'), 'Martes')
  })
})

describe('buildOvertimeDailyRow', () => {
  it('applies 1.25 / 1.5 / 1.75 correctly (not Excel 175% bug)', () => {
    const row = buildOvertimeDailyRow(
      {
        date: '2026-06-16',
        evening_25: 2,
        night_50: 0.5,
        late_75: 0,
        morning_25: 0,
        holiday_100: 0,
      },
      16500
    )
    assert.equal(row.hourlyRate, 68.75)
    assert.equal(row.rate25, 85.94)
    assert.equal(row.rate50, 103.13)
    assert.equal(row.rate75, 120.31) // 68.75 * 1.75 — not 160.42
    assert.equal(row.hrs25, 2)
    assert.equal(row.hrs50, 0.5)
    // 2 * 85.9375 + 0.5 * 103.125 = 171.875 + 51.5625 = 223.4375 → 223.44
    assert.equal(row.totalPay, 223.44)
  })

  it('merges morning into 25% hours', () => {
    const row = buildOvertimeDailyRow(
      {
        date: '2026-06-17',
        evening_25: 1,
        night_50: 0,
        late_75: 0,
        morning_25: 1.5,
        holiday_100: 0,
      },
      16500
    )
    assert.equal(row.hrs25, 2.5)
  })
})

describe('buildOvertimeDailyBreakdownSheet', () => {
  it('filters zero days and totals', () => {
    const sheet = buildOvertimeDailyBreakdownSheet({
      monthlySalary: 16500,
      paidOvertimePay: 395.31,
      ahcDays: [
        {
          date: '2026-06-16',
          evening_25: 2,
          night_50: 0,
          late_75: 0,
          morning_25: 0,
          holiday_100: 0,
        },
        {
          date: '2026-06-17',
          evening_25: 0,
          night_50: 0,
          late_75: 0,
          morning_25: 0,
          holiday_100: 0,
        },
        {
          date: '2026-06-21',
          evening_25: 1,
          night_50: 0,
          late_75: 0,
          morning_25: 0,
          holiday_100: 0,
        },
      ],
    })
    assert.ok(sheet)
    assert.equal(sheet!.rows.length, 2)
    assert.equal(sheet!.breakdownTotalPay, 257.82) // 171.88 + 85.94
    assert.equal(sheet!.paidDiffersFromBreakdown, true)
    assert.equal(sheet!.showHolidayColumn, false)
  })

  it('returns null when no OT days', () => {
    assert.equal(
      buildOvertimeDailyBreakdownSheet({
        monthlySalary: 16500,
        ahcDays: [
          {
            date: '2026-06-16',
            evening_25: 0,
            night_50: 0,
            late_75: 0,
            morning_25: 0,
            holiday_100: 0,
          },
        ],
      }),
      null
    )
  })

  it('shows holiday column when present', () => {
    const sheet = buildOvertimeDailyBreakdownSheet({
      monthlySalary: 24000,
      ahcDays: [
        {
          date: '2026-06-20',
          evening_25: 0,
          night_50: 0,
          late_75: 0,
          morning_25: 0,
          holiday_100: 2,
        },
      ],
    })
    assert.ok(sheet)
    assert.equal(sheet!.showHolidayColumn, true)
    assert.equal(sheet!.rows[0].totalPay, 400) // 2 * 100 * 2
  })
})

describe('receipt PDF overtime daily page', () => {
  const baseRecord = {
    employee_code: 'J001',
    employee_name: 'Jose Manuel Ramirez',
    department: 'Ops',
    position: 'Analista',
    period_start: '2026-06-16',
    period_end: '2026-06-30',
    days_worked: 15,
    base_salary: 8250,
    income_tax: 0,
    professional_tax: 30,
    social_security: 200,
    total_deductions: 230,
    net_salary: 8400,
    bank_name: 'BAC',
    bank_account: '123',
  }

  it('stays on one page without overtime_daily', async () => {
    const pdf = await generateEmployeeReceiptPDF(
      { ...baseRecord, overtime_pay: 100, horas_extras: 2 },
      '2026-06',
      2,
      undefined,
      'Enlace'
    )
    assert.ok(Buffer.isBuffer(pdf))
    assert.equal(pageCount(pdf), 1)
  })

  it('adds landscape page when overtime_daily has rows', async () => {
    const sheet = buildOvertimeDailyBreakdownSheet({
      monthlySalary: 16500,
      paidOvertimePay: 171.88,
      ahcDays: [
        {
          date: '2026-06-16',
          evening_25: 2,
          night_50: 0,
          late_75: 0,
          morning_25: 0,
          holiday_100: 0,
        },
      ],
    })
    assert.ok(sheet)
    const pdf = await generateEmployeeReceiptPDF(
      {
        ...baseRecord,
        overtime_pay: 171.88,
        horas_extras: 2,
        overtime_daily: sheet,
      },
      '2026-06',
      2,
      undefined,
      'Enlace'
    )
    assert.ok(pdf.length > 2000)
    assert.ok(pageCount(pdf) >= 2)
  })
})
