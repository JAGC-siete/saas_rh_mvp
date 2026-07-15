/**
 * Verifica el desglose de HE en el mapeo del comprobante.
 * Run: npx tsx --test tests/voucher-from-run-line-overtime.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { overtimePayReceiptLabel } from '../lib/payroll/receipt'

describe('overtimePayReceiptLabel', () => {
  it('appends hours when horas_extras > 0', () => {
    assert.equal(
      overtimePayReceiptLabel({ horas_extras: 16.63 }),
      'Horas extras (16.63 h)'
    )
  })

  it('uses custom label from voucher options', () => {
    assert.equal(
      overtimePayReceiptLabel(
        { horas_extras: 2 },
        { labels: { overtime_pay: 'Pago HE' } }
      ),
      'Pago HE (2.00 h)'
    )
  })

  it('omits hours when absent', () => {
    assert.equal(overtimePayReceiptLabel({}), 'Horas extras')
  })
})
