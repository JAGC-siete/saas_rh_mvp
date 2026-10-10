/**
 * Pure journal entry builder for payroll (Honduras). No Supabase imports so it stays unit-testable.
 *
 * Amounts are integer cents. Each entry is balanced by construction (every debit is the sum of the
 * credits it pairs with) and checked again with findImbalance() before anything is persisted.
 */

export type CostCenterType = 'ventas' | 'administracion' | 'produccion'

const COST_CENTER_LABELS: Record<CostCenterType, string> = {
  ventas: 'Ventas',
  administracion: 'Administración',
  produccion: 'Producción'
}

export interface ConceptMapping {
  conceptCode: string
  costCenter: CostCenterType | null
  debitAccountId: string | null
  creditAccountId: string | null
}

export interface BuiltLine {
  accountId: string
  debitCents: number
  creditCents: number
  costCenter: CostCenterType | null
  description: string
}

export interface BuiltEntry {
  description: string
  lines: BuiltLine[]
}

export type BuildResult =
  | { ok: true; entries: BuiltEntry[] }
  | { ok: false; error: string }

export interface PayrollLineAmounts {
  costCenter: CostCenterType
  brutoCents: number
  ihssCents: number
  rapCents: number
  isrCents: number
  netoCents: number
}

export interface EmployerTotalsCents {
  ihssPatronal: number
  rapPatronal: number
  infop: number
  provision13: number
  provision14: number
  provisionVacaciones: number
  provisionCesantia: number
}

export function toCents(amount: unknown): number {
  const n = Number(amount)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

export function centsToAmount(cents: number): number {
  return cents / 100
}

/** Returns a description of the imbalance, or null when debits equal credits. */
export function findImbalance(entry: BuiltEntry): string | null {
  const debit = entry.lines.reduce((s, l) => s + l.debitCents, 0)
  const credit = entry.lines.reduce((s, l) => s + l.creditCents, 0)
  if (debit === credit) return null
  return `Debe ${centsToAmount(debit).toFixed(2)} ≠ Haber ${centsToAmount(credit).toFixed(2)}`
}

type Side = 'debit' | 'credit'

interface Posting {
  conceptCode: string
  costCenter: CostCenterType | null
  /** Cost center written on the line; null for company-wide postings. */
  lineCostCenter: CostCenterType | null
  side: Side
  cents: number
  description: string
}

function findMapping(
  mappings: ConceptMapping[],
  conceptCode: string,
  costCenter: CostCenterType | null
): ConceptMapping | undefined {
  return (
    mappings.find((m) => m.conceptCode === conceptCode && m.costCenter === costCenter) ??
    mappings.find((m) => m.conceptCode === conceptCode && m.costCenter === null)
  )
}

/**
 * Resolves each posting to its concept's own account and merges postings that land on the same
 * account, side and cost center. Missing accounts are collected by concept name instead of being
 * skipped, because a skipped line is exactly how an entry ends up unbalanced.
 */
function resolvePostings(
  postings: Posting[],
  mappings: ConceptMapping[],
  conceptNames: Record<string, string>,
  missing: Set<string>
): BuiltLine[] {
  const merged = new Map<string, BuiltLine>()
  for (const p of postings) {
    if (p.cents === 0) continue
    const m = findMapping(mappings, p.conceptCode, p.costCenter)
    const accountId = p.side === 'debit' ? m?.debitAccountId : m?.creditAccountId
    if (!accountId) {
      const name = conceptNames[p.conceptCode] ?? p.conceptCode
      missing.add(p.costCenter ? `${name} (${COST_CENTER_LABELS[p.costCenter]})` : name)
      continue
    }
    const key = `${accountId}|${p.side}|${p.lineCostCenter ?? ''}`
    const cur = merged.get(key)
    if (cur) {
      if (p.side === 'debit') cur.debitCents += p.cents
      else cur.creditCents += p.cents
      if (!cur.description.split(' + ').includes(p.description)) {
        cur.description = `${cur.description} + ${p.description}`
      }
    } else {
      merged.set(key, {
        accountId,
        debitCents: p.side === 'debit' ? p.cents : 0,
        creditCents: p.side === 'credit' ? p.cents : 0,
        costCenter: p.lineCostCenter,
        description: p.description
      })
    }
  }
  return [...merged.values()]
}

function missingMappingError(missing: Set<string>): string {
  return `Falta la cuenta contable para: ${[...missing].join(', ')}. Configúrala en Contabilidad → Mapeos.`
}

function finalize(entries: BuiltEntry[], missing: Set<string>): BuildResult {
  if (missing.size > 0) return { ok: false, error: missingMappingError(missing) }
  const nonEmpty = entries.filter((e) => e.lines.length > 0)
  for (const entry of nonEmpty) {
    if (entry.lines.some((l) => l.debitCents < 0 || l.creditCents < 0)) {
      return {
        ok: false,
        error: `La partida "${entry.description}" tiene montos negativos. Revisa la planilla antes de generar los asientos.`
      }
    }
    const imbalance = findImbalance(entry)
    if (imbalance) {
      return { ok: false, error: `La partida "${entry.description}" no cuadra (${imbalance}).` }
    }
  }
  return { ok: true, entries: nonEmpty }
}

/**
 * Partida 1 (salaries and withholdings) and Partida 2 (employer contributions and provisions).
 * Whatever was withheld beyond IHSS/RAP/ISR (cooperativa, adelantos, deduction plans...) is
 * bruto − statutory − neto per line and goes to `otras_deducciones`.
 */
export function buildPayrollJournalEntries(input: {
  periodLabel: string
  lines: PayrollLineAmounts[]
  employer: EmployerTotalsCents
  mappings: ConceptMapping[]
  conceptNames: Record<string, string>
}): BuildResult {
  const { periodLabel, lines, employer, mappings, conceptNames } = input

  const inconsistentLines = lines.filter(
    (l) => l.brutoCents - l.ihssCents - l.rapCents - l.isrCents - l.netoCents < 0
  ).length
  if (inconsistentLines > 0) {
    const who = inconsistentLines === 1 ? '1 empleado' : `${inconsistentLines} empleados`
    return {
      ok: false,
      error: `La planilla tiene ${who} cuyo neto no cuadra con su salario y deducciones. Revisa esas líneas en la planilla antes de generar los asientos.`
    }
  }

  const byCenter = new Map<CostCenterType, { bruto: number; neto: number }>()
  let ihss = 0
  let rap = 0
  let isr = 0
  let otras = 0
  for (const l of lines) {
    const cur = byCenter.get(l.costCenter) ?? { bruto: 0, neto: 0 }
    cur.bruto += l.brutoCents
    cur.neto += l.netoCents
    byCenter.set(l.costCenter, cur)
    ihss += l.ihssCents
    rap += l.rapCents
    isr += l.isrCents
    otras += l.brutoCents - l.ihssCents - l.rapCents - l.isrCents - l.netoCents
  }

  const salaryPostings: Posting[] = []
  for (const [center, agg] of byCenter) {
    salaryPostings.push(
      { conceptCode: 'sueldos', costCenter: center, lineCostCenter: center, side: 'debit', cents: agg.bruto, description: `Sueldos ${center}` },
      { conceptCode: 'sueldos', costCenter: center, lineCostCenter: null, side: 'credit', cents: agg.neto, description: 'Sueldos por pagar' }
    )
  }
  salaryPostings.push(
    { conceptCode: 'retencion_ihss', costCenter: null, lineCostCenter: null, side: 'credit', cents: ihss, description: 'Retenciones IHSS' },
    { conceptCode: 'retencion_rap', costCenter: null, lineCostCenter: null, side: 'credit', cents: rap, description: 'Retenciones RAP' },
    { conceptCode: 'retencion_isr', costCenter: null, lineCostCenter: null, side: 'credit', cents: isr, description: 'Retenciones ISR' },
    { conceptCode: 'otras_deducciones', costCenter: null, lineCostCenter: null, side: 'credit', cents: otras, description: 'Otras deducciones por pagar' }
  )

  const pair = (conceptCode: string, cents: number, debitLabel: string, creditLabel: string): Posting[] => [
    { conceptCode, costCenter: null, lineCostCenter: null, side: 'debit', cents, description: debitLabel },
    { conceptCode, costCenter: null, lineCostCenter: null, side: 'credit', cents, description: creditLabel }
  ]
  const employerPostings: Posting[] = [
    ...pair('ihss_patronal', employer.ihssPatronal, 'Cargas sociales', 'Aportaciones por pagar'),
    ...pair('rap_patronal', employer.rapPatronal, 'Cargas sociales', 'Aportaciones por pagar'),
    ...pair('infop', employer.infop, 'Cargas sociales', 'INFOP por pagar'),
    ...pair('provision_13', employer.provision13, 'Provisiones laborales', 'Provisión 13°'),
    ...pair('provision_14', employer.provision14, 'Provisiones laborales', 'Provisión 14°'),
    ...pair('provision_vacaciones', employer.provisionVacaciones, 'Provisiones laborales', 'Provisión vacaciones'),
    ...pair('provision_cesantia', employer.provisionCesantia, 'Provisiones laborales', 'Provisión cesantía')
  ]

  const missing = new Set<string>()
  return finalize(
    [
      {
        description: `Nómina ${periodLabel} - Salarios y retenciones`,
        lines: resolvePostings(salaryPostings, mappings, conceptNames, missing)
      },
      {
        description: `Nómina ${periodLabel} - Aportaciones y provisiones`,
        lines: resolvePostings(employerPostings, mappings, conceptNames, missing)
      }
    ],
    missing
  )
}

/**
 * Splits a settlement between the vacation/severance provisions and the unprovisioned excess.
 * Provisions are scaled down when they exceed the settlement, so the parts always add up.
 */
export function allocateSeverance(input: {
  settlementCents: number
  provVacCents: number
  provCesCents: number
}): { provVac: number; provCes: number; excess: number } {
  const settlement = Math.max(0, input.settlementCents)
  let provVac = Math.max(0, input.provVacCents)
  let provCes = Math.max(0, input.provCesCents)
  const provTotal = provVac + provCes
  if (provTotal > settlement) {
    provVac = Math.round((provVac * settlement) / provTotal)
    provCes = settlement - provVac
  }
  return { provVac, provCes, excess: settlement - provVac - provCes }
}

export function buildSeveranceJournalEntry(input: {
  description: string
  settlementCents: number
  provVacCents: number
  provCesCents: number
  mappings: ConceptMapping[]
  conceptNames: Record<string, string>
}): BuildResult {
  if (input.settlementCents <= 0) {
    return { ok: false, error: 'El total de la liquidación es cero, no hay nada que registrar.' }
  }
  const { provVac, provCes, excess } = allocateSeverance(input)
  const pair = (conceptCode: string, cents: number, debitLabel: string): Posting[] => [
    { conceptCode, costCenter: null, lineCostCenter: null, side: 'debit', cents, description: debitLabel },
    { conceptCode, costCenter: null, lineCostCenter: null, side: 'credit', cents, description: 'Sueldos por pagar - Liquidación' }
  ]
  const missing = new Set<string>()
  const lines = resolvePostings(
    [
      ...pair('liquidacion_vacaciones', provVac, 'Uso provisión vacaciones'),
      ...pair('liquidacion_cesantia', provCes, 'Uso provisión cesantía'),
      ...pair('gasto_indemnizacion', excess, 'Gasto indemnizaciones (exceso no provisionado)')
    ],
    input.mappings,
    input.conceptNames,
    missing
  )
  return finalize([{ description: input.description, lines }], missing)
}
