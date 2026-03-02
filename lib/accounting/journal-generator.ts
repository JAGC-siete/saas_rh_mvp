/**
 * Journal Entry Generator for Payroll (Honduras)
 *
 * Generates Partida 1 (salaries + retentions) and Partida 2 (employer contributions + provisions)
 * from an authorized payroll_run.
 */

import { createAdminClient } from '../supabase/server'
import { getTaxBracketsForYear } from '../tax/honduras-tax'
import {
  calculateEmployerContributions,
  calculateINFOP
} from '../payroll/employer-contributions'
import {
  calculateLaborProvisions,
  calculateProvisionVacaciones,
  calculateProvisionCesantia
} from '../payroll/labor-provisions'

type CostCenterType = 'ventas' | 'administracion' | 'produccion'

interface MappingRow {
  concept_code: string
  cost_center_type: CostCenterType | null
  debit_account_id: string | null
  credit_account_id: string | null
}

interface JournalLine {
  account_id: string
  debit_amount: number
  credit_amount: number
  cost_center_type: CostCenterType | null
  description: string
}

interface GenerateJournalResult {
  success: boolean
  journalEntryIds?: string[]
  error?: string
}

const DEFAULT_COST_CENTER: CostCenterType = 'administracion'

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
    const provVac = Math.min(vacationBalance, monthsTotal * monthlyProvVac)
    const provCes = Math.min(severanceAmount, monthsTotal * monthlyProvCes)
    const excess = effBruto - provVac - provCes

    totalProvVac += provVac
    totalProvCes += provCes
    totalSettlement += effBruto
  }

  if (totalSettlement <= 0) {
    return { success: false, error: 'Total de liquidación es cero' }
  }

  const provTotal = totalProvVac + totalProvCes
  if (provTotal > totalSettlement && provTotal > 0) {
    const scale = totalSettlement / provTotal
    totalProvVac = Math.round(totalProvVac * scale * 100) / 100
    totalProvCes = Math.round(totalProvCes * scale * 100) / 100
  }
  const finalExcess = Math.max(0, totalSettlement - totalProvVac - totalProvCes)

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code')
    .eq('company_id', companyId)
    .in('code', ['2104-03', '2104-04', '6104-01', '2101-01'])

  const accMap = new Map<string, string>(
    (accounts || []).map((a: { code: string; id: string }) => [a.code, a.id])
  )
  const provVacId = accMap.get('2104-03')
  const provCesId = accMap.get('2104-04')
  const gastoIndId = accMap.get('6104-01')
  const sueldosPorPagarId = accMap.get('2101-01')

  if (!sueldosPorPagarId) {
    return {
      success: false,
      error:
        'Cuentas contables no configuradas. Ejecute accounting_seed_company_defaults(company_id) primero.'
    }
  }

  const entryDate = new Date(run.year, run.month - 1, 1)
  const partidaLines: JournalLine[] = []

  if (totalProvVac > 0 && provVacId) {
    partidaLines.push({
      account_id: provVacId,
      debit_amount: Math.round(totalProvVac * 100) / 100,
      credit_amount: 0,
      cost_center_type: null,
      description: 'Uso provisión vacaciones - Liquidación'
    })
  }
  if (totalProvCes > 0 && provCesId) {
    partidaLines.push({
      account_id: provCesId,
      debit_amount: Math.round(totalProvCes * 100) / 100,
      credit_amount: 0,
      cost_center_type: null,
      description: 'Uso provisión cesantía - Liquidación'
    })
  }
  if (finalExcess > 0 && gastoIndId) {
    partidaLines.push({
      account_id: gastoIndId,
      debit_amount: Math.round(finalExcess * 100) / 100,
      credit_amount: 0,
      cost_center_type: null,
      description: 'Gasto indemnizaciones (exceso no provisionado)'
    })
  }

  partidaLines.push({
    account_id: sueldosPorPagarId,
    debit_amount: 0,
    credit_amount: Math.round(totalSettlement * 100) / 100,
    cost_center_type: null,
    description: 'Sueldos por pagar - Liquidación'
  })

  const { data: je, error: jeErr } = await supabase
    .from('journal_entries')
    .insert({
      company_id: companyId,
      payroll_run_id: runId,
      entry_date: entryDate.toISOString().split('T')[0],
      currency: 'HNL',
      exchange_rate: 1,
      status: 'draft',
      description: `Liquidación ${periodLabel}`,
      created_by: userId,
      source_reference: {
        payroll_run_id: runId,
        period: periodLabel,
        type: 'severance',
        generated_at: new Date().toISOString()
      }
    })
    .select('id')
    .single()

  if (jeErr || !je) {
    return {
      success: false,
      error: `Error creando asiento de liquidación: ${jeErr?.message ?? 'unknown'}`
    }
  }

  for (const pl of partidaLines) {
    await supabase.from('journal_entry_lines').insert({
      journal_entry_id: je.id,
      account_id: pl.account_id,
      debit_amount: pl.debit_amount,
      credit_amount: pl.credit_amount,
      cost_center_type: pl.cost_center_type,
      description: pl.description
    })
  }

  return { success: true, journalEntryIds: [je.id] }
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

  // 2. Fetch lines
  const { data: lines, error: linesError } = await supabase
    .from('payroll_run_lines')
    .select('id, employee_id, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_neto, metadata')
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

  // 3. Company settings (is_infop_liable)
  const { data: company } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single()

  const isInfopLiable =
    (company?.settings as Record<string, unknown>)?.is_infop_liable === true

  // 4. Fetch mappings and concepts
  const { data: mappings, error: mapError } = await supabase
    .from('accounting_mappings')
    .select('concept_id, cost_center_type, debit_account_id, credit_account_id')
    .eq('company_id', companyId)

  if (mapError) {
    return { success: false, error: 'Error obteniendo mapeos contables' }
  }

  const conceptIds = [
    ...new Set((mappings || []).map((m: any) => m.concept_id).filter(Boolean))
  ]
  const { data: concepts } =
    conceptIds.length > 0
      ? await supabase
          .from('payroll_concepts')
          .select('id, code')
          .in('id', conceptIds)
      : { data: [] }

  const conceptMap = new Map(
    (concepts || []).map((c: any) => [c.id, c.code])
  )

  const mappingMap = new Map<string, MappingRow>()
  for (const m of mappings || []) {
    const code = conceptMap.get(m.concept_id) ?? ''
    const key = `${code}:${m.cost_center_type ?? 'null'}`
    mappingMap.set(key, {
      concept_code: code,
      cost_center_type: m.cost_center_type,
      debit_account_id: m.debit_account_id,
      credit_account_id: m.credit_account_id
    })
  }

  if (mappingMap.size === 0) {
    return {
      success: false,
      error:
        'No hay mapeos contables. Ejecute accounting_seed_company_defaults(company_id) primero.'
    }
  }

  const getAccount = (
    conceptCode: string,
    costCenter: CostCenterType | null
  ): { debit?: string; credit?: string } => {
    const key1 = `${conceptCode}:${costCenter}`
    const key2 = `${conceptCode}:null`
    const m = mappingMap.get(key1) ?? mappingMap.get(key2)
    if (!m) return {}
    return {
      debit: m.debit_account_id ?? undefined,
      credit: m.credit_account_id ?? undefined
    }
  }

  const getCreditFromAny = (conceptCode: string): string | undefined => {
    for (const ct of ['ventas', 'administracion', 'produccion', null]) {
      const { credit } = getAccount(conceptCode, ct as CostCenterType | null)
      if (credit) return credit
    }
    return undefined
  }

  // 5. Tax constants and factor for 2PAGOS
  const taxConstants = await getTaxBracketsForYear(run.year)
  const factor2Pagos = run.tipo === '2PAGOS' ? 0.5 : 1

  // 6. Aggregate by cost center
  const byCenter = new Map<
    CostCenterType,
    { bruto: number; ihss: number; rap: number; isr: number; neto: number }
  >()

  for (const line of linesWithFallback) {
    const cur = byCenter.get(line.costCenter) ?? {
      bruto: 0,
      ihss: 0,
      rap: 0,
      isr: 0,
      neto: 0
    }
    cur.bruto += line.eff_bruto
    cur.ihss += line.eff_ihss
    cur.rap += line.eff_rap
    cur.isr += line.eff_isr
    cur.neto += line.eff_neto
    byCenter.set(line.costCenter, cur)
  }

  const totalBruto = linesWithFallback.reduce((s, l) => s + l.eff_bruto, 0)
  const totalIhss = linesWithFallback.reduce((s, l) => s + l.eff_ihss, 0)
  const totalRap = linesWithFallback.reduce((s, l) => s + l.eff_rap, 0)
  const totalIsr = linesWithFallback.reduce((s, l) => s + l.eff_isr, 0)
  const totalNeto = linesWithFallback.reduce((s, l) => s + l.eff_neto, 0)

  // Employer contributions and provisions
  let totalIhssPatronal = 0
  let totalRapPatronal = 0
  let totalProv13 = 0
  let totalProv14 = 0
  let totalProvVac = 0
  let totalProvCes = 0

  for (const line of linesWithFallback) {
    const emp = calculateEmployerContributions({
      monthlySalary: line.baseSalary,
      taxConstants,
      factor2Pagos
    })
    totalIhssPatronal += emp.ihssPatronal
    totalRapPatronal += emp.rapPatronal

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
    totalProv13 += prov.provision13
    totalProv14 += prov.provision14
    totalProvVac += prov.provisionVacaciones
    totalProvCes += prov.provisionCesantia
  }

  const totalInfop = isInfopLiable ? calculateINFOP(totalBruto) : 0

  const entryDate = new Date(run.year, run.month - 1, 1)
  const periodLabel = `${run.year}-${String(run.month).padStart(2, '0')} Q${run.quincena}`

  const sourceRef = {
    payroll_run_id: runId,
    period: periodLabel,
    generated_at: new Date().toISOString()
  }

  const journalEntryIds: string[] = []

  // 7. Partida 1: Salarios y retenciones
  const partida1Lines: JournalLine[] = []

  for (const [center, agg] of byCenter) {
    if (agg.bruto <= 0) continue
    const { debit } = getAccount('sueldos', center)
    if (!debit) {
      return {
        success: false,
        error: `Centro de costo "${center}" sin mapeo de cuenta Debe. Configure el mapeo en Contabilidad.`
      }
    }
    partida1Lines.push({
      account_id: debit,
      debit_amount: Math.round(agg.bruto * 100) / 100,
      credit_amount: 0,
      cost_center_type: center,
      description: `Sueldos ${center}`
    })
  }

  const sumDebitsPartida1 = partida1Lines
    .filter((pl) => pl.debit_amount > 0)
    .reduce((s, pl) => s + pl.debit_amount, 0)
  const cuadraturaDiff = Math.abs(sumDebitsPartida1 - totalBruto)
  if (cuadraturaDiff > 0.02) {
    return {
      success: false,
      error: `Cuadratura fallida: suma centros ${sumDebitsPartida1.toFixed(2)} != total bruto ${totalBruto.toFixed(2)} (diff ${cuadraturaDiff.toFixed(2)})`
    }
  }

  const { credit: creditIhss } = getAccount('retencion_ihss', null)
  if (creditIhss && totalIhss > 0) {
    partida1Lines.push({
      account_id: creditIhss,
      debit_amount: 0,
      credit_amount: Math.round(totalIhss * 100) / 100,
      cost_center_type: null,
      description: 'Retenciones IHSS'
    })
  }

  const { credit: creditRap } = getAccount('retencion_rap', null)
  if (creditRap && totalRap > 0) {
    partida1Lines.push({
      account_id: creditRap,
      debit_amount: 0,
      credit_amount: Math.round(totalRap * 100) / 100,
      cost_center_type: null,
      description: 'Retenciones RAP'
    })
  }

  const { credit: creditIsr } = getAccount('retencion_isr', null)
  if (creditIsr && totalIsr > 0) {
    partida1Lines.push({
      account_id: creditIsr,
      debit_amount: 0,
      credit_amount: Math.round(totalIsr * 100) / 100,
      cost_center_type: null,
      description: 'Retenciones ISR'
    })
  }

  const creditSueldos = getCreditFromAny('sueldos')
  if (creditSueldos && totalNeto > 0) {
    partida1Lines.push({
      account_id: creditSueldos,
      debit_amount: 0,
      credit_amount: Math.round(totalNeto * 100) / 100,
      cost_center_type: null,
      description: 'Sueldos por pagar'
    })
  }

  if (partida1Lines.length > 0) {
    const { data: je1, error: je1Err } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        payroll_run_id: runId,
        entry_date: entryDate.toISOString().split('T')[0],
        currency: 'HNL',
        exchange_rate: 1,
        status: 'draft',
        description: `Nómina ${periodLabel} - Salarios y retenciones`,
        created_by: userId,
        source_reference: sourceRef
      })
      .select('id')
      .single()

    if (je1Err || !je1) {
      return {
        success: false,
        error: `Error creando partida 1: ${je1Err?.message ?? 'unknown'}`
      }
    }

    journalEntryIds.push(je1.id)

    for (const pl of partida1Lines) {
      await supabase.from('journal_entry_lines').insert({
        journal_entry_id: je1.id,
        account_id: pl.account_id,
        debit_amount: pl.debit_amount,
        credit_amount: pl.credit_amount,
        cost_center_type: pl.cost_center_type,
        description: pl.description
      })
    }
  }

  // 8. Partida 2: Aportaciones patronales + provisiones
  const partida2Lines: JournalLine[] = []

  const { debit: debitCargas, credit: creditAport } = getAccount(
    'ihss_patronal',
    null
  )

  if (debitCargas && creditAport) {
    const totalCargas =
      totalIhssPatronal + totalRapPatronal + totalInfop
    if (totalCargas > 0) {
      partida2Lines.push({
        account_id: debitCargas,
        debit_amount: Math.round(totalCargas * 100) / 100,
        credit_amount: 0,
        cost_center_type: null,
        description: 'Cargas sociales (IHSS, RAP, INFOP)'
      })
      partida2Lines.push({
        account_id: creditAport,
        debit_amount: 0,
        credit_amount: Math.round((totalIhssPatronal + totalRapPatronal) * 100) / 100,
        cost_center_type: null,
        description: 'Aportaciones por pagar'
      })
    }

    if (totalInfop > 0) {
      const { credit: creditInfop } = getAccount('infop', null)
      if (creditInfop) {
        partida2Lines.push({
          account_id: creditInfop,
          debit_amount: 0,
          credit_amount: Math.round(totalInfop * 100) / 100,
          cost_center_type: null,
          description: 'INFOP por pagar'
        })
      }
    }
  }

  const totalProvisiones =
    totalProv13 + totalProv14 + totalProvVac + totalProvCes
  const { debit: debitProv } = getAccount('provision_13', null)

  if (debitProv && totalProvisiones > 0) {
    partida2Lines.push({
      account_id: debitProv,
      debit_amount: Math.round(totalProvisiones * 100) / 100,
      credit_amount: 0,
      cost_center_type: null,
      description: 'Provisiones laborales'
    })

    const { credit: creditP13 } = getAccount('provision_13', null)
    const { credit: creditP14 } = getAccount('provision_14', null)
    const { credit: creditPVac } = getAccount('provision_vacaciones', null)
    const { credit: creditPCes } = getAccount('provision_cesantia', null)

    if (creditP13 && totalProv13 > 0) {
      partida2Lines.push({
        account_id: creditP13,
        debit_amount: 0,
        credit_amount: Math.round(totalProv13 * 100) / 100,
        cost_center_type: null,
        description: 'Provisión 13°'
      })
    }
    if (creditP14 && totalProv14 > 0) {
      partida2Lines.push({
        account_id: creditP14,
        debit_amount: 0,
        credit_amount: Math.round(totalProv14 * 100) / 100,
        cost_center_type: null,
        description: 'Provisión 14°'
      })
    }
    if (creditPVac && totalProvVac > 0) {
      partida2Lines.push({
        account_id: creditPVac,
        debit_amount: 0,
        credit_amount: Math.round(totalProvVac * 100) / 100,
        cost_center_type: null,
        description: 'Provisión vacaciones'
      })
    }
    if (creditPCes && totalProvCes > 0) {
      partida2Lines.push({
        account_id: creditPCes,
        debit_amount: 0,
        credit_amount: Math.round(totalProvCes * 100) / 100,
        cost_center_type: null,
        description: 'Provisión cesantía'
      })
    } else if (creditPVac && totalProvCes > 0) {
      partida2Lines.push({
        account_id: creditPVac,
        debit_amount: 0,
        credit_amount: Math.round(totalProvCes * 100) / 100,
        cost_center_type: null,
        description: 'Provisión cesantía'
      })
    }
  }

  if (partida2Lines.length > 0) {
    const { data: je2, error: je2Err } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        payroll_run_id: runId,
        entry_date: entryDate.toISOString().split('T')[0],
        currency: 'HNL',
        exchange_rate: 1,
        status: 'draft',
        description: `Nómina ${periodLabel} - Aportaciones y provisiones`,
        created_by: userId,
        source_reference: sourceRef
      })
      .select('id')
      .single()

    if (je2Err || !je2) {
      return {
        success: false,
        error: `Error creando partida 2: ${je2Err?.message ?? 'unknown'}`,
        journalEntryIds
      }
    }

    journalEntryIds.push(je2.id)

    for (const pl of partida2Lines) {
      await supabase.from('journal_entry_lines').insert({
        journal_entry_id: je2.id,
        account_id: pl.account_id,
        debit_amount: pl.debit_amount,
        credit_amount: pl.credit_amount,
        cost_center_type: pl.cost_center_type,
        description: pl.description
      })
    }
  }

  return { success: true, journalEntryIds }
}
