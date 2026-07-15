/**
 * Net display must subtract customs when present.
 * Run: npx tsx --test tests/resolve-display-net.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveDisplayNet } from '../lib/payroll/resolve-display-net'

describe('resolveDisplayNet', () => {
  it('recomputes bruto − total when customs exist (voucher bug case)', () => {
    const bruto = 10750
    const statutory = 297.58 + 71.98 + 0
    const custom = 828.29 + 200.58
    const totalDeductions = statutory + custom
    const storedNeto = bruto - statutory // 10380.44 — statutory-only

    assert.equal(
      resolveDisplayNet({
        bruto,
        totalDeductions,
        customDeductions: custom,
        storedNeto,
      }),
      9351.57
    )
  })

  it('keeps stored neto when there are no customs', () => {
    assert.equal(
      resolveDisplayNet({
        bruto: 10750,
        totalDeductions: 369.56,
        customDeductions: 0,
        storedNeto: 10380.44,
      }),
      10380.44
    )
  })
})
