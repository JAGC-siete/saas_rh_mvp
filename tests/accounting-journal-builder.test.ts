/**
 * Payroll journal builder: every entry balances (Debe = Haber), other deductions get their own
 * line, missing mappings and inconsistent lines fail with a readable message.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  allocateSeverance,
  buildPayrollJournalEntries,
  buildSeveranceJournalEntry,
  findImbalance,
  toCents,
  type BuiltEntry,
  type ConceptMapping,
  type CostCenterType,
  type EmployerTotalsCents,
  type PayrollLineAmounts
} from '../lib/accounting/journal-builder'

/** Mirrors accounting_seed_company_defaults (account ids are the NIIF codes). */
const SEED_MAPPINGS: ConceptMapping[] = [
  { conceptCode: 'sueldos', costCenter: 'ventas', debitAccountId: '6101-01', creditAccountId: '2101-01' },
  { conceptCode: 'sueldos', costCenter: 'administracion', debitAccountId: '6101-02', creditAccountId: '2101-01' },
  { conceptCode: 'sueldos', costCenter: 'produccion', debitAccountId: '6101-03', creditAccountId: '2101-01' },
  { conceptCode: 'retencion_ihss', costCenter: null, debitAccountId: null, creditAccountId: '2102-01' },
  { conceptCode: 'retencion_rap', costCenter: null, debitAccountId: null, creditAccountId: '2102-02' },
  { conceptCode: 'retencion_isr', costCenter: null, debitAccountId: null, creditAccountId: '2102-03' },
  { conceptCode: 'otras_deducciones', costCenter: null, debitAccountId: null, creditAccountId: '2105-01' },
  { conceptCode: 'ihss_patronal', costCenter: null, debitAccountId: '6102-01', creditAccountId: '2103-01' },
  { conceptCode: 'rap_patronal', costCenter: null, debitAccountId: '6102-01', creditAccountId: '2103-01' },
  { conceptCode: 'infop', costCenter: null, debitAccountId: '6102-01', creditAccountId: '2103-02' },
  { conceptCode: 'provision_13', costCenter: null, debitAccountId: '6103-01', creditAccountId: '2104-01' },
  { conceptCode: 'provision_14', costCenter: null, debitAccountId: '6103-01', creditAccountId: '2104-02' },
  { conceptCode: 'provision_vacaciones', costCenter: null, debitAccountId: '6103-01', creditAccountId: '2104-03' },
  { conceptCode: 'provision_cesantia', costCenter: null, debitAccountId: '6103-01', creditAccountId: '2104-04' },
  { conceptCode: 'liquidacion_vacaciones', costCenter: null, debitAccountId: '2104-03', creditAccountId: '2101-01' },
  { conceptCode: 'liquidacion_cesantia', costCenter: null, debitAccountId: '2104-04', creditAccountId: '2101-01' },
  { conceptCode: 'gasto_indemnizacion', costCenter: null, debitAccountId: '6104-01', creditAccountId: '2101-01' }
]

const NAMES: Record<string, string> = {
  sueldos: 'Sueldos y Salarios',
  otras_deducciones: 'Otras deducciones',
  provision_14: 'Provisión Décimo Cuarto',
  infop: 'INFOP'
}

const EMPLOYER: EmployerTotalsCents = {
  ihssPatronal: 59_500,
  rapPatronal: 33_015,
  infop: 3_000,
  provision13: 25_000,
  provision14: 25_000,
  provisionVacaciones: 12_500,
  provisionCesantia: 25_000
}

function line(
  bruto: number,
  ihss: number,
  rap: number,
  isr: number,
  neto: number,
  costCenter: CostCenterType = 'administracion'
): PayrollLineAmounts {
  return {
    costCenter,
    brutoCents: toCents(bruto),
    ihssCents: toCents(ihss),
    rapCents: toCents(rap),
    isrCents: toCents(isr),
    netoCents: toCents(neto)
  }
}

function build(lines: PayrollLineAmounts[], employer = EMPLOYER, mappings = SEED_MAPPINGS) {
  return buildPayrollJournalEntries({
    periodLabel: '2026-09 Q2',
    lines,
    employer,
    mappings,
    conceptNames: NAMES
  })
}

function assertAllBalanced(entries: BuiltEntry[]) {
  for (const e of entries) assert.equal(findImbalance(e), null, e.description)
}

function amountOn(entry: BuiltEntry, accountId: string, side: 'debit' | 'credit'): number {
  return entry.lines
    .filter((l) => l.accountId === accountId)
    .reduce((s, l) => s + (side === 'debit' ? l.debitCents : l.creditCents), 0)
}

describe('buildPayrollJournalEntries', () => {
  it('simple payroll: both partidas balance', () => {
    const result = build([line(15000, 595, 247.5, 0, 14157.5)])
    assert.ok(result.ok)
    assert.equal(result.entries.length, 2)
    assertAllBalanced(result.entries)
    assert.equal(amountOn(result.entries[0], '2105-01', 'credit'), 0)
  })

  it('other deductions get their own credit line and keep Partida 1 balanced', () => {
    // 15,000 bruto − statutory 842.50 − cooperativa 500 − adelanto 1,000 = 12,657.50 neto
    const result = build([line(15000, 595, 247.5, 0, 12657.5), line(9000, 357, 148.5, 0, 8494.5)])
    assert.ok(result.ok)
    assertAllBalanced(result.entries)
    assert.equal(amountOn(result.entries[0], '2105-01', 'credit'), 150_000)
    assert.equal(amountOn(result.entries[0], '2101-01', 'credit'), toCents(12657.5 + 8494.5))
  })

  it('splits salary expense by cost center and merges net pay into one account', () => {
    const result = build([
      line(10000, 300, 100, 0, 9600, 'ventas'),
      line(12000, 360, 120, 50, 11470, 'administracion'),
      line(8000, 240, 80, 0, 7680, 'produccion')
    ])
    assert.ok(result.ok)
    assertAllBalanced(result.entries)
    const p1 = result.entries[0]
    assert.equal(amountOn(p1, '6101-01', 'debit'), 1_000_000)
    assert.equal(amountOn(p1, '6101-02', 'debit'), 1_200_000)
    assert.equal(amountOn(p1, '6101-03', 'debit'), 800_000)
    assert.equal(p1.lines.filter((l) => l.accountId === '2101-01').length, 1)
  })

  it('stays balanced to the cent with many lines of awkward amounts', () => {
    const lines: PayrollLineAmounts[] = []
    for (let i = 0; i < 200; i++) {
      const bruto = 7333.33 + i * 0.37
      const ihss = Math.round(bruto * 0.035 * 100) / 100
      const rap = Math.round(bruto * 0.015 * 100) / 100
      const isr = i % 3 === 0 ? 123.45 : 0
      const otras = i % 4 === 0 ? 333.33 : 0
      const neto = Math.round((bruto - ihss - rap - isr - otras) * 100) / 100
      lines.push(line(bruto, ihss, rap, isr, neto, (['ventas', 'administracion', 'produccion'] as const)[i % 3]))
    }
    const result = build(lines, {
      ihssPatronal: 1_234_567,
      rapPatronal: 765_433,
      infop: 146_667,
      provision13: 1_222_221,
      provision14: 1_222_221,
      provisionVacaciones: 611_111,
      provisionCesantia: 1_222_221
    })
    assert.ok(result.ok)
    assertAllBalanced(result.entries)
  })

  it('Partida 2 uses each concept mapping and merges shared debit accounts', () => {
    const result = build([line(15000, 595, 247.5, 0, 14157.5)])
    assert.ok(result.ok)
    const p2 = result.entries[1]
    assertAllBalanced([p2])
    assert.equal(amountOn(p2, '6102-01', 'debit'), 59_500 + 33_015 + 3_000)
    assert.equal(amountOn(p2, '2103-01', 'credit'), 59_500 + 33_015)
    assert.equal(amountOn(p2, '2103-02', 'credit'), 3_000)
    assert.equal(amountOn(p2, '6103-01', 'debit'), 25_000 + 25_000 + 12_500 + 25_000)
    assert.equal(amountOn(p2, '2104-04', 'credit'), 25_000)
    assert.equal(p2.lines.filter((l) => l.accountId === '6102-01').length, 1)
  })

  it('honours a customized rap_patronal mapping instead of reusing ihss_patronal', () => {
    const mappings = SEED_MAPPINGS.map((m) =>
      m.conceptCode === 'rap_patronal' ? { ...m, creditAccountId: '2103-09' } : m
    )
    const result = build([line(15000, 595, 247.5, 0, 14157.5)], EMPLOYER, mappings)
    assert.ok(result.ok)
    assert.equal(amountOn(result.entries[1], '2103-09', 'credit'), 33_015)
    assert.equal(amountOn(result.entries[1], '2103-01', 'credit'), 59_500)
  })

  it('without INFOP liability there is no INFOP line', () => {
    const result = build([line(15000, 595, 247.5, 0, 14157.5)], { ...EMPLOYER, infop: 0 })
    assert.ok(result.ok)
    assertAllBalanced(result.entries)
    assert.equal(amountOn(result.entries[1], '2103-02', 'credit'), 0)
  })

  it('fails naming every concept with a missing account', () => {
    const mappings = SEED_MAPPINGS.filter(
      (m) => m.conceptCode !== 'provision_14' && m.conceptCode !== 'otras_deducciones'
    )
    const result = build([line(15000, 595, 247.5, 0, 12657.5)], EMPLOYER, mappings)
    assert.equal(result.ok, false)
    assert.ok(!result.ok)
    assert.match(result.error, /Otras deducciones/)
    assert.match(result.error, /Provisión Décimo Cuarto/)
    assert.match(result.error, /Contabilidad → Mapeos/)
  })

  it('a missing account is not an error when that concept has no amount', () => {
    const mappings = SEED_MAPPINGS.filter((m) => m.conceptCode !== 'otras_deducciones')
    const result = build([line(15000, 595, 247.5, 0, 14157.5)], EMPLOYER, mappings)
    assert.ok(result.ok)
  })

  it('names the cost center when its salary mapping is missing', () => {
    const mappings = SEED_MAPPINGS.filter(
      (m) => !(m.conceptCode === 'sueldos' && m.costCenter === 'produccion')
    )
    const result = build([line(8000, 240, 80, 0, 7680, 'produccion')], EMPLOYER, mappings)
    assert.ok(!result.ok)
    assert.match(result.error, /Sueldos y Salarios \(Producción\)/)
  })

  it('refuses lines whose net exceeds gross minus withholdings', () => {
    const result = build([
      line(15000, 595, 247.5, 0, 14157.5),
      line(7000, 200, 100, 0, 7426.68),
      line(7000, 200, 100, 0, 6986.46)
    ])
    assert.ok(!result.ok)
    assert.match(result.error, /2 empleados cuyo neto no cuadra/)
  })
})

describe('severance', () => {
  it('allocateSeverance scales provisions down when they exceed the settlement', () => {
    const a = allocateSeverance({ settlementCents: 100_000, provVacCents: 80_000, provCesCents: 70_000 })
    assert.equal(a.provVac + a.provCes + a.excess, 100_000)
    assert.equal(a.excess, 0)
  })

  it('builds a balanced entry with provisions and unprovisioned excess', () => {
    const result = buildSeveranceJournalEntry({
      description: 'Liquidación - prueba',
      settlementCents: 4_533_333,
      provVacCents: 312_517,
      provCesCents: 1_250_011,
      mappings: SEED_MAPPINGS,
      conceptNames: NAMES
    })
    assert.ok(result.ok)
    const entry = result.entries[0]
    assert.equal(findImbalance(entry), null)
    assert.equal(amountOn(entry, '2101-01', 'credit'), 4_533_333)
    assert.equal(amountOn(entry, '6104-01', 'debit'), 4_533_333 - 312_517 - 1_250_011)
  })

  it('zero settlement is rejected', () => {
    const result = buildSeveranceJournalEntry({
      description: 'x',
      settlementCents: 0,
      provVacCents: 0,
      provCesCents: 0,
      mappings: SEED_MAPPINGS,
      conceptNames: NAMES
    })
    assert.equal(result.ok, false)
  })
})
