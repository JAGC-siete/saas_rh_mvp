/**
 * Construye la respuesta del preview a partir de una corrida ya autorizada o distribuida,
 * sin mutar payroll_runs ni payroll_run_lines (evita degradar a draft al recargar la UI).
 */

import { HONDURAS_LABOR_FACTOR } from './constants'
import {
  coalescePlanillaPayType,
  isHourBasedPayType,
  type EffectivePayType,
} from './resolve-effective-pay-type'

export type AuthorizedRunRow = {
  id: string
  year: number
  month: number
  quincena: number
  tipo: string
  status: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveLinePayType(
  empPayType: unknown,
  meta: Record<string, unknown>
): EffectivePayType {
  // Prefer frozen metadata from when the line was calculated
  if (meta.pay_type != null) return coalescePlanillaPayType(meta.pay_type)
  return coalescePlanillaPayType(empPayType)
}

export async function buildAuthorizedPayrollPreviewPayload(
  supabase: { from: (t: string) => any },
  companyId: string,
  run: AuthorizedRunRow
): Promise<Record<string, unknown>> {
  const { data: lines, error } = await supabase
    .from('payroll_run_lines')
    .select(
      `
      id,
      employee_id,
      eff_hours,
      eff_bruto,
      eff_ihss,
      eff_rap,
      eff_isr,
      eff_neto,
      metadata,
      edited,
      seventh_day_pay,
      employees!payroll_run_lines_employee_id_fkey(
        id,
        name,
        dni,
        employee_code,
        base_salary,
        bank_name,
        bank_account,
        pay_type,
        departments!employees_department_id_fkey(name)
      )
    `
    )
    .eq('run_id', run.id)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message || 'Error leyendo líneas de nómina')
  }

  const planilla_fixed: Record<string, unknown>[] = []
  const planilla_hourly: Record<string, unknown>[] = []

  for (const line of lines || []) {
    const emp = (line as { employees?: Record<string, unknown> }).employees
    if (!emp) continue

    const meta = ((line as { metadata?: Record<string, unknown> }).metadata || {}) as Record<
      string,
      unknown
    >
    const payType = resolveLinePayType(emp.pay_type, meta)
    const base_salary = Number(emp.base_salary) || 0
    const departmentName =
      (emp.departments as { name?: string } | undefined)?.name || 'Sin Departamento'
    const eff_bruto = Number((line as { eff_bruto?: unknown }).eff_bruto) || 0
    const eff_neto = Number((line as { eff_neto?: unknown }).eff_neto) || 0
    const IHSS = Number((line as { eff_ihss?: unknown }).eff_ihss) || 0
    const RAP = Number((line as { eff_rap?: unknown }).eff_rap) || 0
    const ISR = Number((line as { eff_isr?: unknown }).eff_isr) || 0
    const total_hours = Number((line as { eff_hours?: unknown }).eff_hours) || 0
    const total_deducciones = round2(Math.max(0, eff_bruto - eff_neto))
    const lineId = (line as { id: string }).id
    const edited = Boolean((line as { edited?: boolean }).edited)
    const horasExtras =
      meta.horas_extras != null && Number.isFinite(Number(meta.horas_extras))
        ? round2(Number(meta.horas_extras))
        : undefined

    if (isHourBasedPayType(payType)) {
      const hourly_rate =
        total_hours > 0 ? eff_bruto / total_hours : base_salary / HONDURAS_LABOR_FACTOR
      const days_worked =
        typeof meta.days_worked === 'number' ? meta.days_worked : 0
      planilla_hourly.push({
        employee_id: emp.id,
        id: (emp.employee_code as string) || '',
        name: (emp.name as string) || 'Sin nombre',
        bank: (emp.bank_name as string) || 'No especificado',
        bank_account: (emp.bank_account as string) || 'No especificado',
        department: departmentName,
        base_salary,
        monthly_salary: base_salary,
        days_worked,
        days_absent: 0,
        ...(horasExtras != null ? { horas_extras: horasExtras } : {}),
        total_hours_worked: round2(total_hours),
        hourly_rate: round2(hourly_rate),
        total_earnings: round2(eff_bruto),
        IHSS: round2(IHSS),
        RAP: round2(RAP),
        ISR: round2(ISR),
        total_deducciones,
        total: round2(eff_neto),
        line_id: lineId,
        pay_type: payType,
        metadata: { ...meta, tax_year: meta.tax_year ?? run.year, pay_type: payType },
        edited
      })
    } else {
      planilla_fixed.push({
        employee_id: emp.id,
        id: (emp.employee_code as string) || '',
        name: (emp.name as string) || 'Sin nombre',
        bank: (emp.bank_name as string) || 'No especificado',
        bank_account: (emp.bank_account as string) || 'No especificado',
        department: departmentName,
        base_salary,
        monthly_salary: base_salary,
        days_worked: round2(total_hours),
        days_absent: 0,
        ...(horasExtras != null ? { horas_extras: horasExtras } : {}),
        total_earnings: round2(eff_bruto),
        IHSS: round2(IHSS),
        RAP: round2(RAP),
        ISR: round2(ISR),
        total_deducciones,
        total: round2(eff_neto),
        line_id: lineId,
        pay_type: 'fixed',
        metadata: meta,
        edited
      })
    }
  }

  const totalBrutoFixed = planilla_fixed.reduce((s, r) => s + (r.total_earnings as number), 0)
  const totalDeduccionesFixed = planilla_fixed.reduce((s, r) => s + (r.total_deducciones as number), 0)
  const totalNetoFixed = planilla_fixed.reduce((s, r) => s + (r.total as number), 0)
  const totalBrutoHourly = planilla_hourly.reduce((s, r) => s + (r.total_earnings as number), 0)
  const totalDeduccionesHourly = planilla_hourly.reduce(
    (s, r) => s + (r.total_deducciones as number),
    0
  )
  const totalNetoHourly = planilla_hourly.reduce((s, r) => s + (r.total as number), 0)
  const totalEmpleados = planilla_fixed.length + planilla_hourly.length

  return {
    message:
      run.status === 'distributed'
        ? 'Planilla distribuida (solo lectura)'
        : 'Planilla autorizada para este período (solo lectura)',
    run_id: run.id,
    status: run.status,
    year: run.year,
    month: run.month,
    quincena: run.quincena,
    tipo: run.tipo,
    empleados: totalEmpleados,
    empleados_fixed: planilla_fixed.length,
    empleados_hourly: planilla_hourly.length,
    totalBruto: round2(totalBrutoFixed + totalBrutoHourly),
    totalDeducciones: round2(totalDeduccionesFixed + totalDeduccionesHourly),
    totalNeto: round2(totalNetoFixed + totalNetoHourly),
    totalBrutoFixed: round2(totalBrutoFixed),
    totalDeduccionesFixed: round2(totalDeduccionesFixed),
    totalNetoFixed: round2(totalNetoFixed),
    totalBrutoHourly: round2(totalBrutoHourly),
    totalDeduccionesHourly: round2(totalDeduccionesHourly),
    totalNetoHourly: round2(totalNetoHourly),
    planilla_fixed,
    planilla_hourly,
    planilla: [...planilla_fixed, ...planilla_hourly],
    warning:
      totalEmpleados === 0
        ? 'La corrida está autorizada pero no tiene líneas en base de datos.'
        : null,
    noAttendanceWarning: null,
    incompleteRecordsAlert: undefined
  }
}
