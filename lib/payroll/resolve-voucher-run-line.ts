import { resolvePayrollDeductionMode } from './deduction-mode'

type RunRef = {
  year: number
  month: number
  quincena: number
  tipo: string
  status: string
}

const CLOSED_STATUSES = ['authorized', 'distributed'] as const
const OPEN_STATUSES = ['edited', 'draft'] as const

/**
 * Cuando hay corridas duplicadas por período (p. ej. inducción CON + 2PAGOS),
 * el comprobante debe usar la línea del run que coincide con payroll_deduction_mode
 * de la empresa, no el line_id que venga del preview desactualizado.
 */
export async function resolveCanonicalVoucherRunLineId(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => any
    }
  },
  companyId: string,
  requestedRunLineId: string
): Promise<string> {
  const { data: line, error: lineError } = await supabase
    .from('payroll_run_lines')
    .select(
      `
      id,
      employee_id,
      payroll_runs:run_id (
        year,
        month,
        quincena,
        tipo,
        status
      )
    `
    )
    .eq('id', requestedRunLineId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (lineError || !line?.employee_id) {
    return requestedRunLineId
  }

  const run = line.payroll_runs as RunRef | null
  if (!run) {
    return requestedRunLineId
  }

  const { data: payrollConfig } = await supabase
    .from('company_payroll_configs')
    .select('metadata, payment_frequency')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle()

  const metadata = (payrollConfig?.metadata as Record<string, unknown> | null) ?? {}
  const paymentFrequency =
    payrollConfig?.payment_frequency ?? (metadata.payment_frequency as string | undefined)
  const companyMode = resolvePayrollDeductionMode(metadata, paymentFrequency)

  if (run.tipo === companyMode) {
    return requestedRunLineId
  }

  for (const statusGroup of [CLOSED_STATUSES, OPEN_STATUSES]) {
    const { data: canonicalRun } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('company_id', companyId)
      .eq('year', run.year)
      .eq('month', run.month)
      .eq('quincena', run.quincena)
      .eq('tipo', companyMode)
      .in('status', [...statusGroup])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!canonicalRun?.id) continue

    const { data: canonicalLine } = await supabase
      .from('payroll_run_lines')
      .select('id')
      .eq('run_id', canonicalRun.id)
      .eq('employee_id', line.employee_id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (canonicalLine?.id) {
      return canonicalLine.id as string
    }
  }

  return requestedRunLineId
}
