import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPlanillaPreviewPayload } from '../lib/payroll/planilla-preview'
import { resolvePlanillaDaysWorked } from '../lib/payroll/planilla-from-run'
import type { LoadedPlanillaFromRun } from '../lib/payroll/planilla-from-run'

const sampleLoaded: LoadedPlanillaFromRun = {
  payrollRun: {
    id: 'run-1',
    company_id: 'co-1',
    year: 2026,
    month: 6,
    quincena: 2,
    tipo: 'CON',
    status: 'edited',
  },
  planillaFixed: [
    {
      id: '0512',
      name: 'Arnoldo Neptali Oseguera',
      bank: 'BAC',
      bank_account: '123',
      department: 'Operaciones',
      monthly_salary: 15000,
      days_worked: 15,
      days_absent: 0,
      late_days: 0,
      total_earnings: 7500,
      IHSS: 297.58,
      RAP: 23.23,
      ISR: 0,
      total_deductions: 320.81,
      total: 7179.19,
      pay_type: 'fixed',
    },
  ],
  planillaHourly: [],
  periodo: '2026-06',
  companyName: 'Enlace',
  periodDates: { period_start: '2026-06-16', period_end: '2026-06-30' },
  pdfPayrollConfig: {
    currency: 'HNL',
    payment_frequency: 'biweekly',
    payment_cut_dates: {},
    legal_deductions: { ihss: true, rap: true, isr: true },
    country_code: 'HND',
  },
  defaultPdfGroupBy: 'none',
  isDraftPreview: true,
}

describe('buildPlanillaPreviewPayload', () => {
  it('builds summary and employee rows for on-screen preview', () => {
    const preview = buildPlanillaPreviewPayload(sampleLoaded)
    assert.equal(preview.companyName, 'Enlace')
    assert.equal(preview.isDraftPreview, true)
    assert.equal(preview.fixedRows.length, 1)
    assert.equal(preview.fixedRows[0]?.daysWorked, 15)
    assert.equal(preview.summary.employees, 1)
    assert.equal(preview.summary.totalNet, 7179.19)
    assert.ok(preview.periodRange.includes('Jun'))
    assert.ok(preview.defaultFilename.includes('planilla_2026-06_q2'))
  })
})

describe('resolvePlanillaDaysWorked', () => {
  it('uses eff_hours as days for fixed employees', () => {
    assert.equal(resolvePlanillaDaysWorked('fixed', 15), 15)
  })

  it('prefers metadata.days_worked for hour-based types', () => {
    assert.equal(resolvePlanillaDaysWorked('admin_floor', 97.96, 15), 15)
    assert.equal(resolvePlanillaDaysWorked('hourly', 80, 10), 10)
  })

  it('legacy: converts eff_hours to days for hourly when metadata missing', () => {
    assert.equal(resolvePlanillaDaysWorked('hourly', 80), 10)
  })
})
