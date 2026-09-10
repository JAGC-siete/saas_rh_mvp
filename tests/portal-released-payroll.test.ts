/**
 * Portal released payroll helpers.
 * Run: npx tsx --test tests/portal-released-payroll.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isPortalReleasedPayrollStatus,
  mapReleasedRunLineToPortalItem,
  PORTAL_RELEASED_STATUSES,
} from '../lib/employee-portal/released-payroll'

describe('portal released payroll statuses', () => {
  it('includes authorized, distributed, paid only', () => {
    assert.deepEqual([...PORTAL_RELEASED_STATUSES], ['authorized', 'distributed', 'paid'])
    assert.equal(isPortalReleasedPayrollStatus('authorized'), true)
    assert.equal(isPortalReleasedPayrollStatus('distributed'), true)
    assert.equal(isPortalReleasedPayrollStatus('paid'), true)
    assert.equal(isPortalReleasedPayrollStatus('draft'), false)
    assert.equal(isPortalReleasedPayrollStatus('edited'), false)
  })
})

describe('mapReleasedRunLineToPortalItem', () => {
  it('maps a released run line and builds periodo', () => {
    const item = mapReleasedRunLineToPortalItem({
      id: 'line-1',
      eff_bruto: 1000,
      eff_ihss: 10,
      eff_rap: 5,
      eff_isr: 0,
      eff_neto: 985,
      eff_hours: 80,
      payroll_runs: {
        year: 2026,
        month: 8,
        quincena: 1,
        status: 'authorized',
        tipo: 'CON',
      },
    })
    assert.ok(item)
    assert.equal(item!.runLineId, 'line-1')
    assert.equal(item!.periodo, '2026-08')
    assert.equal(item!.quincena, 1)
    assert.equal(item!.eff_neto, 985)
    assert.equal(item!.tipo, 'CON')
  })

  it('returns null for draft runs', () => {
    const item = mapReleasedRunLineToPortalItem({
      id: 'line-2',
      eff_bruto: 1000,
      eff_neto: 900,
      payroll_runs: {
        year: 2026,
        month: 8,
        quincena: 1,
        status: 'draft',
      },
    })
    assert.equal(item, null)
  })

  it('unwraps payroll_runs when returned as array', () => {
    const item = mapReleasedRunLineToPortalItem({
      id: 'line-3',
      eff_bruto: 500,
      eff_neto: 400,
      payroll_runs: [
        {
          year: 2026,
          month: 7,
          quincena: 2,
          status: 'distributed',
          tipo: '2PAGOS',
        },
      ],
    })
    assert.ok(item)
    assert.equal(item!.status, 'distributed')
    assert.equal(item!.periodo, '2026-07')
    assert.equal(item!.tipo, '2PAGOS')
  })
})
