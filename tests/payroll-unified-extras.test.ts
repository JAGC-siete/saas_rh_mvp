/**
 * Regresión: mapa preview → UnifiedRow debe preservar horas_extras AHC (Caso 1 / Enlace "—").
 * Run: npx tsx --test tests/payroll-unified-extras.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mapPlanillaItemToUnifiedRow,
  summarizeUnifiedRows,
} from '../lib/payroll-unified'

describe('mapPlanillaItemToUnifiedRow', () => {
  it('maps horas_extras into extras.horas (fixed informational HE)', () => {
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

  it('treats missing/invalid horas_extras as 0 (shows — in UI)', () => {
    assert.equal(mapPlanillaItemToUnifiedRow({ horas_extras: undefined } as any).extras.horas, 0)
    assert.equal(mapPlanillaItemToUnifiedRow({ horas_extras: 'x' } as any).extras.horas, 0)
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
