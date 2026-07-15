/**
 * Regresión: mapa preview → UnifiedRow debe preservar horas_extras AHC (Caso 1 / Enlace "—").
 * + merge run-lines no debe mapear eff_hours (horas) → days_worked en hour-based.
 * Run: npx tsx --test tests/payroll-unified-extras.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mapPlanillaItemToUnifiedRow,
  mergeRunLineIntoUnifiedRow,
  resolveDaysWorkedForUnifiedRow,
  summarizeUnifiedRows,
} from '../lib/payroll-unified'
import { sumAdminFloorPeriodHours } from '../lib/payroll/admin-floor-hours'

describe('mapPlanillaItemToUnifiedRow', () => {
  it('maps horas_extras into extras.horas (fixed AHC HE display)', () => {
    const row = mapPlanillaItemToUnifiedRow({
      employee_id: 'e1',
      name: 'Test',
      base_salary: 15000,
      total_earnings: 7500,
      IHSS: 0,
      RAP: 0,
      ISR: 0,
      total_deducciones: 0,
      total: 7500,
      days_worked: 15,
      days_absent: 0,
      late_days: 0,
      pay_type: 'fixed',
      horas_extras: 11.95,
    })
    assert.equal(row.extras.horas, 11.95)
    assert.equal(row.extras.monto, 0)
    assert.equal(row.pay_type, 'fixed')
  })

  it('maps admin_floor horas_extras (floor.overtime) into extras.horas', () => {
    const floor = sumAdminFloorPeriodHours(
      [
        { check_in: '1', check_out: '2', total_hours: 10 },
        { check_in: '1', check_out: '2', total_hours: 9 },
      ],
      8
    )
    assert.equal(floor.overtime, 3)
    const row = mapPlanillaItemToUnifiedRow({
      employee_id: 'e2',
      name: 'Admin Floor',
      base_salary: 15000,
      total_earnings: 8000,
      IHSS: 0,
      RAP: 0,
      ISR: 0,
      total_deducciones: 0,
      total: 8000,
      days_worked: 2,
      days_absent: 0,
      late_days: 0,
      pay_type: 'admin_floor',
      total_hours_worked: floor.payable,
      horas_extras: floor.overtime,
    })
    assert.equal(row.pay_type, 'admin_floor')
    assert.equal(row.extras.horas, 3)
    assert.equal(row.days_worked, 2)
    assert.notEqual(row.days_worked, row.total_hours_worked)
  })

  it('treats missing/invalid horas_extras as 0 (shows — in UI)', () => {
    assert.equal(mapPlanillaItemToUnifiedRow({ horas_extras: undefined } as any).extras.horas, 0)
    assert.equal(mapPlanillaItemToUnifiedRow({ horas_extras: 'x' } as any).extras.horas, 0)
  })
})

describe('resolveDaysWorkedForUnifiedRow / mergeRunLineIntoUnifiedRow', () => {
  it('prefers metadata.days_worked for admin_floor even when eff_hours is clock hours', () => {
    const days = resolveDaysWorkedForUnifiedRow(
      'admin_floor',
      { eff_hours: 97.96, metadata: { days_worked: 15, pay_type: 'admin_floor' } },
      0
    )
    assert.equal(days, 15)
  })

  it('does not use eff_hours as days for hour-based without metadata', () => {
    assert.equal(
      resolveDaysWorkedForUnifiedRow('hourly', { eff_hours: 80 }, 10),
      10
    )
    assert.equal(
      resolveDaysWorkedForUnifiedRow('admin_floor', { eff_hours: 97.96 }, undefined),
      0
    )
  })

  it('uses eff_hours as days for fixed', () => {
    assert.equal(
      resolveDaysWorkedForUnifiedRow('fixed', { eff_hours: 15 }, 0),
      15
    )
  })

  it('merge keeps days ≠ hours for admin_floor and restores AHC from metadata', () => {
    const base = mapPlanillaItemToUnifiedRow({
      employee_id: 'e3',
      name: 'X',
      base_salary: 15000,
      total_earnings: 100,
      IHSS: 0,
      RAP: 0,
      ISR: 0,
      total_deducciones: 0,
      total: 100,
      days_worked: 15,
      days_absent: 0,
      late_days: 0,
      pay_type: 'admin_floor',
      total_hours_worked: 120,
      horas_extras: 2,
    })
    const merged = mergeRunLineIntoUnifiedRow(base, {
      eff_hours: 97.96,
      eff_bruto: 5000,
      eff_neto: 4500,
      metadata: {
        pay_type: 'admin_floor',
        days_worked: 15,
        total_hours_worked: 97.96,
        horas_extras: 4.5,
      },
    })
    assert.equal(merged.days_worked, 15)
    assert.equal(merged.total_hours_worked, 97.96)
    assert.equal(merged.extras.horas, 4.5)
    assert.notEqual(merged.days_worked, merged.total_hours_worked)
  })
})

describe('summarizeUnifiedRows', () => {
  it('sums extras.horas into total_horas_extras', () => {
    const a = mapPlanillaItemToUnifiedRow({
      employee_id: 'a',
      name: 'A',
      base_salary: 1,
      total_earnings: 100,
      IHSS: 0,
      RAP: 0,
      ISR: 0,
      total_deducciones: 0,
      total: 100,
      days_worked: 1,
      days_absent: 0,
      late_days: 0,
      horas_extras: 2.5,
    })
    const b = mapPlanillaItemToUnifiedRow({
      employee_id: 'b',
      name: 'B',
      base_salary: 1,
      total_earnings: 200,
      IHSS: 0,
      RAP: 0,
      ISR: 0,
      total_deducciones: 0,
      total: 200,
      days_worked: 1,
      days_absent: 0,
      late_days: 0,
      horas_extras: 1.5,
    })
    const resumen = summarizeUnifiedRows([a, b])
    assert.equal(resumen.total_horas_extras, 4)
    assert.equal(resumen.empleados, 2)
  })
})
