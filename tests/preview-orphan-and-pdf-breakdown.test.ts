/**
 * Draft orphan line sync + PDF executive breakdown (+N más).
 * Run: npx tsx --test tests/preview-orphan-and-pdf-breakdown.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { findOrphanPayrollLineIds } from '../lib/payroll/preview-orphan-lines'
import { buildExecutiveBreakdownLines } from '../lib/payroll/pdf-layout'

describe('findOrphanPayrollLineIds', () => {
  it('returns ids for employees not in the kept set', () => {
    const orphans = findOrphanPayrollLineIds(
      [
        { id: 'l1', employee_id: 'a' },
        { id: 'l2', employee_id: 'inactive' },
        { id: 'l3', employee_id: 'b' },
      ],
      ['a', 'b']
    )
    assert.deepEqual(orphans, ['l2'])
  })

  it('skips rows without employee_id', () => {
    assert.deepEqual(
      findOrphanPayrollLineIds([{ id: 'x', employee_id: null }, { id: 'y' }], ['a']),
      []
    )
  })

  it('returns empty when all lines are kept', () => {
    assert.deepEqual(
      findOrphanPayrollLineIds(
        [
          { id: 'l1', employee_id: 'a' },
          { id: 'l2', employee_id: 'b' },
        ],
        ['a', 'b']
      ),
      []
    )
  })
})

describe('buildExecutiveBreakdownLines', () => {
  const fmt = (n: number) => `L ${n}`

  it('lists all entries when under maxLines (alpha order)', () => {
    const lines = buildExecutiveBreakdownLines(
      [
        { key: 'TI', count: 2, net: 100 },
        { key: 'AYR', count: 1, net: 50 },
      ],
      { maxLines: 5, formatNet: fmt }
    )
    assert.deepEqual(lines, ['AYR: 1 emp. - L 50', 'TI: 2 emp. - L 100'])
  })

  it('collapses overflow into +N más with combined employees/net', () => {
    const entries = [
      { key: 'Administración', count: 7, net: 1000 },
      { key: 'AYR', count: 4, net: 400 },
      { key: 'Courier', count: 2, net: 200 },
      { key: 'Motoristas', count: 4, net: 300 },
      { key: 'Operaciones', count: 14, net: 2000 },
      { key: 'TI', count: 7, net: 800 },
      { key: 'Transporte', count: 1, net: 100 },
    ]
    const lines = buildExecutiveBreakdownLines(entries, { maxLines: 5, formatNet: fmt })
    assert.equal(lines.length, 5)
    assert.equal(lines[0], 'Administración: 7 emp. - L 1000')
    assert.ok(lines[4]!.startsWith('+3 más'))
    assert.ok(lines[4]!.includes('22 emp.')) // TI 7 + Transporte 1 + last not shown wait
    // Alpha: Admin, AYR, Courier, Motoristas, Operaciones | rest: TI, Transporte = 2?
    // showCount = maxLines - 1 = 4 → Admin, AYR, Courier, Motoristas
    // rest = Operaciones(14), TI(7), Transporte(1) = 3 groups, 22 emp, net 2900
    assert.equal(lines[4], '+3 más (22 emp.) - L 2900')
  })

  it('fits exactly 7 Enlace-like depts without +N when maxLines=7', () => {
    const entries = [
      { key: 'Administración', count: 1, net: 1 },
      { key: 'AYR', count: 1, net: 1 },
      { key: 'Courier', count: 1, net: 1 },
      { key: 'Motoristas', count: 1, net: 1 },
      { key: 'Operaciones', count: 1, net: 1 },
      { key: 'TI', count: 1, net: 1 },
      { key: 'Transporte', count: 1, net: 1 },
    ]
    const lines = buildExecutiveBreakdownLines(entries, { maxLines: 7, formatNet: fmt })
    assert.equal(lines.length, 7)
    assert.ok(!lines.some((l) => l.includes('más')))
  })
})
