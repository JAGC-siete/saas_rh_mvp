/**
 * Journal Entry Generator for Payroll (Honduras)
 *
 * Generates Partida 1 (salaries + retentions) and Partida 2 (employer contributions + provisions)
 * from an authorized payroll_run. Amounts and balancing live in `journal-builder.ts`; this file
 * loads data and persists the result.
 *
 * Trazabilidad: retenciones desde `payroll_run_lines.eff_*` (origen statutory-deductions-compute);
 * parámetros fiscales vía `getTaxEngine` (mismo motor que nómina). Ver `payroll-statutory-trace.ts`.
 */

import { createAdminClient } from '../supabase/server'
import { normalizeCountryCode } from '../country/supported'
import { getTaxEngine } from '../tax/registry'
import {
  buildJournalPayrollSourceReference,
  buildJournalStatutoryTraceBlock,
  resolvePayrollLineTaxYear,
  type JournalPayrollSourceReference
} from './payroll-statutory-trace'
import {
  calculateEmployerContributions,
  calculateINFOP
} from '../payroll/employer-contributions'
import {
  calculateLaborProvisions,
  calculateProvisionVacaciones,
  calculateProvisionCesantia
} from '../payroll/labor-provisions'
import {
  buildPayrollJournalEntries,
  buildSeveranceJournalEntry,
  centsToAmount,
  toCents,
  type BuiltEntry,
  type ConceptMapping,
  type CostCenterType,
  type PayrollLineAmounts
} from './journal-builder'

interface GenerateJournalResult {
  success: boolean
  journalEntryIds?: string[]
  statutoryTrace?: JournalPayrollSourceReference['statutory']
  error?: string
  code?: 'ALREADY_GENERATED'
}

const DEFAULT_COST_CENTER: CostCenterType = 'administracion'

const ALREADY_GENERATED_ERROR =
  'Esta planilla ya tiene sus asientos contables. Puedes verlos o exportarlos abajo.'

export async function loadConceptMappings(
  supabase: any,
  companyId: string
): Promise<{ mappings: ConceptMapping[]; conceptNames: Record<string, string> } | { error: string }> {
  const { data: rows, error } = await supabase
    .from('accounting_mappings')
    .select('concept_id, cost_center_type, debit_account_id, credit_account_id')
    .eq('company_id', companyId)

  if (error) return { error: 'Error obteniendo mapeos contables' }
  if (!rows?.length) {
    return {
      error:
        'La contabilidad de esta empresa no está configurada. Entra a Contabilidad y presiona "Inicializar Catálogo".'
    }
  }

  const conceptIds = [...new Set(rows.map((m: any) => m.concept_id).filter(Boolean))]
  const { data: concepts } = await supabase
    .from('payroll_concepts')
    .select('id, code, name')
    .in('id', conceptIds)

  const codeById = new Map<string, string>()
  const conceptNames: Record<string, string> = {}
  for (const c of concepts ?? []) {
    codeById.set(c.id, c.code)
    conceptNames[c.code] = c.name
  }

  const mappings: ConceptMapping[] = rows.map((m: any) => ({
    conceptCode: codeById.get(m.concept_id) ?? '',
    costCenter: m.cost_center_type ?? null,
    debitAccountId: m.debit_account_id ?? null,
    creditAccountId: m.credit_account_id ?? null
  }))

  return { mappings, conceptNames }
}

/**
 * Inserts the header and all lines in one call. If the lines fail, the header is removed so no
 * half-written entry is left behind (a real transaction comes with the RPC version).
 */
export async function persistJournalEntry(
  supabase: any,
  header: Record<string, unknown>,
  entry: BuiltEntry
): Promise<{ id: string } | { error: string }> {
  const { data: je, error: jeErr } = await supabase
    .from('journal_entries')
    .insert({ ...header, description: entry.description })
    .select('id')
    .single()

  if (jeErr || !je) {
    return { error: `Error creando la partida: ${jeErr?.message ?? 'unknown'}` }
  }

  const { error: linesErr } = await supabase.from('journal_entry_lines').insert(
    entry.lines.map((l) => ({
      journal_entry_id: je.id,
      account_id: l.accountId,
      debit_amount: centsToAmount(l.debitCents),
      credit_amount: centsToAmount(l.creditCents),
      cost_center_type: l.costCenter,
      description: l.description
    }))
  )

  if (linesErr) {
    await supabase.from('journal_entries').delete().eq('id', je.id)
    return { error: `Error guardando las líneas de la partida: ${linesErr.message}` }
  }

  return { id: je.id }
}

async function persistEntries(
  supabase: any,
  header: Record<string, unknown>,
  entries: BuiltEntry[]
): Promise<{ ids: string[] } | { error: string }> {
  const ids: string[] = []
  for (const entry of entries) {
    const saved = await persistJournalEntry(supabase, header, entry)
    if ('error' in saved) {
      if (ids.length > 0) await supabase.from('journal_entries').delete().in('id', ids)
      return { error: saved.error }
    }
    ids.push(saved.id)
  }
  return { ids }
}

async function generateSeveranceJournalFromRun(
  supabase: any,
  companyId: string,
  runId: string,
  run: { year: number; month: number; quincena: number },
  payrollLines: any[],
  userId: string
): Promise<GenerateJournalResult> {
  const periodLabel = `${run.year}-${String(run.month).padStart(2, '0')} Q${run.quincena}`
  const lastDay =
    run.quincena === 1 ? 15 : new Date(run.year, run.month, 0).getDate()
  const defaultTerminationDate = `${run.year}-${String(run.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  let totalProvVac = 0
  let totalProvCes = 0
  let totalSettlement = 0

  for (const line of payrollLines) {
    const effBruto = Number(line.eff_bruto) || 0
    if (effBruto <= 0) continue

    const meta = (line.metadata as Record<string, unknown>) || {}
    const terminationDate =
      (meta.termination_date as string) || defaultTerminationDate

    let severanceAmount = Number(meta.severance_amount) || 0
    let vacationBalance = Number(meta.vacation_balance) || 0
    let monthsTotal = Number(meta.months_of_service) || 0
    let avgSalary = Number(meta.average_salary) || 0

    if (severanceAmount === 0 && vacationBalance === 0) {
      const { data: calc } = await supabase.rpc('reports_calculate_severance', {
        p_company_id: companyId,
        p_employee_id: line.employee_id,
        p_termination_date: terminationDate
      })
      const c = Array.isArray(calc) ? calc[0] : calc
      if (c) {
        severanceAmount = Number(c.severance_amount) || 0
        vacationBalance = Number(c.vacation_balance) || 0
        avgSalary = Number(c.average_salary) || 0
        const b = c.calculation_breakdown as Record<string, unknown> | null
        monthsTotal = Number(b?.months_of_service) || 0
      }
    }

    if (avgSalary <= 0) {
      const { data: emp } = await supabase
        .from('employees')
        .select('base_salary')
        .eq('id', line.employee_id)
        .single()
      avgSalary = Number(emp?.base_salary) || 0
    }

    const monthlyProvVac = calculateProvisionVacaciones(avgSalary)
    const monthlyProvCes = calculateProvisionCesantia(avgSalary)
    totalProvVac += toCents(Math.min(vacationBalance, monthsTotal * monthlyProvVac))
    totalProvCes += toCents(Math.min(severanceAmount, monthsTotal * monthlyProvCes))
    totalSettlement += toCents(effBruto)
  }

  const loaded = await loadConceptMappings(supabase, companyId)
  if ('error' in loaded) return { success: false, error: loaded.error }

  const built = buildSeveranceJournalEntry({
    description: `Liquidación ${periodLabel}`,
    settlementCents: totalSettlement,
    provVacCents: totalProvVac,
    provCesCents: totalProvCes,
    mappings: loaded.mappings,
    conceptNames: loaded.conceptNames
  })
  if (!built.ok) return { success: false, error: built.error }

  const entryDate = new Date(run.year, run.month - 1, 1)
  const saved = await persistEntries(
    supabase,
    {
      company_id: companyId,
      payroll_run_id: runId,
      entry_date: entryDate.toISOString().split('T')[0],
      currency: 'HNL',
      exchange_rate: 1,
      status: 'draft',
      created_by: userId,
      source_reference: {
        payroll_run_id: runId,
        period: periodLabel,
        type: 'severance',
        generated_at: new Date().toISOString()
      }
    },
    built.entries
  )
  if ('error' in saved) return { success: false, error: saved.error }

  return { success: true, journalEntryIds: saved.ids }
}

export async function generateJournalEntriesFromPayrollRun(
  runId: string,
  companyId: string,
  userId: string
): Promise<GenerateJournalResult> {
  const supabase = createAdminClient()

  // 1. Fetch payroll run
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('id, company_id, year, month, quincena, tipo, status')
    .eq('id', runId)
    .eq('company_id', companyId)
    .single()

  if (runError || !run) {
    return { success: false, error: 'Corrida de nómina no encontrada' }
  }

  if (run.status !== 'authorized' && run.status !== 'distributed') {
    return { success: false, error: 'La corrida debe estar autorizada para generar asientos' }
  }

  const { data: existing } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('company_id', companyId)
    .eq('payroll_run_id', runId)
    .neq('status', 'void')
    .limit(1)

  if (existing?.length) {
    return { success: false, error: ALREADY_GENERATED_ERROR, code: 'ALREADY_GENERATED' }
  }

  // 2. Fetch lines
  const { data: lines, error: linesError } = await supabase
    .from('payroll_run_lines')
    .select(
      'id, employee_id, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, tax_year, metadata'
    )
    .eq('run_id', runId)
    .eq('company_id', companyId)

  if (linesError) {
    return { success: false, error: 'Error obteniendo líneas de nómina' }
  }

  const payrollLines = lines || []
  if (payrollLines.length === 0) {
    return { success: false, error: 'No hay líneas de nómina en esta corrida' }
  }

  // 2b. LIQUIDACION: single severance journal entry
  if (run.tipo === 'LIQUIDACION') {
    return generateSeveranceJournalFromRun(
      supabase,
      companyId,
      runId,
      run,
      payrollLines,
      userId
    )
  }

  const employeeIds = [...new Set(payrollLines.map((l: any) => l.employee_id))]

  // Fetch employees with departments
  const { data: employees } = await supabase
    .from('employees')
    .select('id, department_id, base_salary')
    .in('id', employeeIds)

  const deptIds = [
    ...new Set(
      (employees || [])
        .map((e: any) => e.department_id)
        .filter((id): id is string => Boolean(id))
    )
  ]
  const { data: departments } =
    deptIds.length > 0
      ? await supabase
          .from('departments')
          .select('id, cost_center_type')
          .in('id', deptIds)
      : { data: [] }

  const empMap = new Map(employees?.map((e: any) => [e.id, e]) ?? [])
  const deptMap = new Map(
    departments?.map((d: any) => [d.id, d]) ?? []
  )

  const linesWithFallback = payrollLines.map((l: any) => {
    const emp = empMap.get(l.employee_id)
    const dept = emp?.department_id
      ? deptMap.get(emp.department_id)
      : null
    const costCenter =
      (dept?.cost_center_type as CostCenterType) || DEFAULT_COST_CENTER
    return {
      eff_bruto: Number(l.eff_bruto) || 0,
      eff_ihss: Number(l.eff_ihss) || 0,
      eff_rap: Number(l.eff_rap) || 0,
      eff_isr: Number(l.eff_isr) || 0,
      eff_neto: Number(l.eff_neto) || 0,
      costCenter,
      baseSalary: Number(emp?.base_salary) || 0
    }
  })

  // 3. Company settings (is_infop_liable) and country
  const { data: company } = await supabase
    .from('companies')
    .select('settings, country_code')
    .eq('id', companyId)
    .single()

  const isInfopLiable =
    (company?.settings as Record<string, unknown>)?.is_infop_liable === true

  // 4. Mappings
  const loaded = await loadConceptMappings(supabase, companyId)
  if ('error' in loaded) return { success: false, error: loaded.error }

  // 5. Tax constants and factor for 2PAGOS (Honduras employer formulas)
  const runCountry = normalizeCountryCode(company?.country_code)
  if (runCountry !== 'HND') {
    return {
      success: false,
      error:
        'La generación de asientos contables desde nómina solo está implementada para empresas en Honduras (HND).'
    }
  }
  const yearCtx = await getTaxEngine('HND').loadYearContext(run.year)
  const taxConstants = yearCtx.hndTaxConstants
  if (!taxConstants) {
    return {
      success: false,
      error: 'No se pudieron cargar los parámetros fiscales de Honduras para el año de la corrida.'
    }
  }
  const factor2Pagos = run.tipo === '2PAGOS' ? 0.5 : 1

  // 6. Employer contributions and provisions
  const employer = {
    ihssPatronal: 0,
    rapPatronal: 0,
    infop: 0,
    provision13: 0,
    provision14: 0,
    provisionVacaciones: 0,
    provisionCesantia: 0
  }

  for (const line of linesWithFallback) {
    const emp = calculateEmployerContributions({
      monthlySalary: line.baseSalary,
      taxConstants,
      factor2Pagos
    })
    employer.ihssPatronal += toCents(emp.ihssPatronal)
    employer.rapPatronal += toCents(emp.rapPatronal)

    const periodSalary = line.baseSalary * factor2Pagos
    const prorationFactor =
      periodSalary > 0
        ? Math.min(1, Math.max(0, line.eff_bruto / periodSalary))
        : 1

    const prov = calculateLaborProvisions({
      monthlySalary: line.baseSalary,
      factor2Pagos,
      prorationFactor
    })
    employer.provision13 += toCents(prov.provision13)
    employer.provision14 += toCents(prov.provision14)
    employer.provisionVacaciones += toCents(prov.provisionVacaciones)
    employer.provisionCesantia += toCents(prov.provisionCesantia)
  }

  const lineAmounts: PayrollLineAmounts[] = linesWithFallback.map((l) => ({
    costCenter: l.costCenter,
    brutoCents: toCents(l.eff_bruto),
    ihssCents: toCents(l.eff_ihss),
    rapCents: toCents(l.eff_rap),
    isrCents: toCents(l.eff_isr),
    netoCents: toCents(l.eff_neto)
  }))
  const totalBrutoCents = lineAmounts.reduce((s, l) => s + l.brutoCents, 0)
  employer.infop = isInfopLiable ? toCents(calculateINFOP(centsToAmount(totalBrutoCents))) : 0

  const periodLabel = `${run.year}-${String(run.month).padStart(2, '0')} Q${run.quincena}`

  const built = buildPayrollJournalEntries({
    periodLabel,
    lines: lineAmounts,
    employer,
    mappings: loaded.mappings,
    conceptNames: loaded.conceptNames
  })
  if (!built.ok) return { success: false, error: built.error }

  const payrollLineTaxYear = resolvePayrollLineTaxYear(
    payrollLines.map((l: { tax_year?: number | null }) => l.tax_year)
  )
  const statutoryTrace = buildJournalStatutoryTraceBlock({
    trace: yearCtx.trace,
    retentionTotals: {
      ihss: centsToAmount(lineAmounts.reduce((s, l) => s + l.ihssCents, 0)),
      rap: centsToAmount(lineAmounts.reduce((s, l) => s + l.rapCents, 0)),
      isr: centsToAmount(lineAmounts.reduce((s, l) => s + l.isrCents, 0))
    },
    payrollLineTaxYear
  })
  const sourceRef = buildJournalPayrollSourceReference({
    payrollRunId: runId,
    period: periodLabel,
    statutory: statutoryTrace
  })

  // 7. Persist Partida 1 + Partida 2
  const entryDate = new Date(run.year, run.month - 1, 1)
  const saved = await persistEntries(
    supabase,
    {
      company_id: companyId,
      payroll_run_id: runId,
      entry_date: entryDate.toISOString().split('T')[0],
      currency: 'HNL',
      exchange_rate: 1,
      status: 'draft',
      created_by: userId,
      source_reference: sourceRef
    },
    built.entries
  )
  if ('error' in saved) return { success: false, error: saved.error }

  return { success: true, journalEntryIds: saved.ids, statutoryTrace }
}
