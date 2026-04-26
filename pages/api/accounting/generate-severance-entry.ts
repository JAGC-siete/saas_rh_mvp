import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import {
  calculateProvisionVacaciones,
  calculateProvisionCesantia
} from '../../../lib/payroll/labor-provisions'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'

/**
 * POST /api/accounting/generate-severance-entry
 *
 * Generates a journal entry for employee severance (liquidación).
 * Uses reports_calculate_severance for amounts; estimates provisioned balance.
 *
 * Body: { employee_id: string, termination_date: string (YYYY-MM-DD), company_id?: string }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    const { employee_id, termination_date, company_id: bodyCompanyId } =
      req.body || {}

    const companyId = auth.companyId ?? bodyCompanyId

    if (!companyId) {
      return res.status(400).json({
        error: 'company_id es requerido',
        message:
          'Super admin debe enviar company_id en el body. Usuarios de empresa lo obtienen del contexto.'
      })
    }

    if (!employee_id || !termination_date) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        message: 'employee_id y termination_date son requeridos'
      })
    }

    const parsedDate = new Date(termination_date)
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        error: 'Formato de fecha inválido',
        message: 'termination_date debe ser una fecha válida (YYYY-MM-DD)'
      })
    }

    if (
      auth.role !== 'super_admin' &&
      auth.companyId &&
      auth.companyId !== companyId
    ) {
      return res.status(403).json({
        error: 'No tiene permiso para generar asientos en esta empresa'
      })
    }

    const supabase = createAdminClient()

    const { data: severanceData, error: rpcError } = await supabase.rpc(
      'reports_calculate_severance',
      {
        p_company_id: companyId,
        p_employee_id: employee_id,
        p_termination_date: termination_date
      }
    )

    if (rpcError) {
      return res.status(500).json({
        error: 'Error calculando liquidación',
        details: rpcError.message
      })
    }

    const calc = Array.isArray(severanceData) ? severanceData[0] : severanceData
    if (!calc) {
      return res.status(404).json({
        error: 'Cálculo fallido',
        message: 'No se pudo calcular la liquidación para el empleado indicado'
      })
    }

    const severanceAmount = Number(calc.severance_amount) || 0
    const vacationBalance = Number(calc.vacation_balance) || 0
    const totalSettlement = Number(calc.total_settlement) || 0
    const avgSalary = Number(calc.average_salary) || 0
    const breakdown = calc.calculation_breakdown as Record<string, unknown> | null
    const monthsTotal = Number(breakdown?.months_of_service) || 0

    if (totalSettlement <= 0) {
      return res.status(400).json({
        error: 'Sin monto a liquidar',
        message: 'El total de liquidación es cero'
      })
    }

    const monthlyProvVac = calculateProvisionVacaciones(avgSalary)
    const monthlyProvCes = calculateProvisionCesantia(avgSalary)
    const provisionedVacaciones = Math.min(
      vacationBalance,
      monthsTotal * monthlyProvVac
    )
    const provisionedCesantia = Math.min(
      severanceAmount,
      monthsTotal * monthlyProvCes
    )
    const excessNotProvisioned =
      totalSettlement - provisionedVacaciones - provisionedCesantia

    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .eq('company_id', companyId)
      .in('code', ['2104-03', '2104-04', '6104-01', '2101-01'])

    const accMap = new Map((accounts || []).map((a: any) => [a.code, a.id]))
    const provVacId = accMap.get('2104-03')
    const provCesId = accMap.get('2104-04')
    const gastoIndId = accMap.get('6104-01')
    const sueldosPorPagarId = accMap.get('2101-01')

    if (!sueldosPorPagarId) {
      return res.status(400).json({
        error: 'Cuentas contables no configuradas',
        message:
          'Ejecute accounting_seed_company_defaults(company_id) primero.'
      })
    }

    const entryDate = termination_date
    const empName = (calc.employee_name as string) || 'Empleado'
    const description = `Liquidación - ${empName} - ${termination_date}`

    const lines: Array<{
      account_id: string
      debit_amount: number
      credit_amount: number
      description: string
    }> = []

    if (provisionedVacaciones > 0 && provVacId) {
      lines.push({
        account_id: provVacId,
        debit_amount: Math.round(provisionedVacaciones * 100) / 100,
        credit_amount: 0,
        description: 'Uso provisión vacaciones'
      })
    }
    if (provisionedCesantia > 0 && provCesId) {
      lines.push({
        account_id: provCesId,
        debit_amount: Math.round(provisionedCesantia * 100) / 100,
        credit_amount: 0,
        description: 'Uso provisión cesantía'
      })
    }
    if (excessNotProvisioned > 0 && gastoIndId) {
      lines.push({
        account_id: gastoIndId,
        debit_amount: Math.round(excessNotProvisioned * 100) / 100,
        credit_amount: 0,
        description: 'Gasto indemnizaciones (exceso no provisionado)'
      })
    }

    lines.push({
      account_id: sueldosPorPagarId,
      debit_amount: 0,
      credit_amount: Math.round(totalSettlement * 100) / 100,
      description: 'Sueldos por pagar - Liquidación'
    })

    const { data: je, error: jeError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        payroll_run_id: null,
        entry_date: entryDate,
        currency: 'HNL',
        exchange_rate: 1,
        status: 'draft',
        description,
        created_by: auth.user?.id ?? null,
        source_reference: {
          type: 'severance',
          employee_id,
          termination_date,
          total_settlement: totalSettlement,
          severance_amount: severanceAmount,
          vacation_balance: vacationBalance,
          provisioned_vacaciones: provisionedVacaciones,
          provisioned_cesantia: provisionedCesantia,
          excess: excessNotProvisioned
        }
      })
      .select('id')
      .single()

    if (jeError || !je) {
      return res.status(500).json({
        error: 'Error creando partida contable',
        details: jeError?.message ?? 'unknown'
      })
    }

    for (const line of lines) {
      await supabase.from('journal_entry_lines').insert({
        journal_entry_id: je.id,
        account_id: line.account_id,
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
        description: line.description
      })
    }

    return res.status(200).json({
      success: true,
      journal_entry_id: je.id,
      message: 'Asiento de liquidación generado correctamente',
      summary: {
        total_settlement: totalSettlement,
        provisioned_vacaciones: provisionedVacaciones,
        provisioned_cesantia: provisionedCesantia,
        excess_indemnizacion: excessNotProvisioned
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    if (message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'No autorizado' })
    }
    return res.status(500).json({ error: message })
  }
}

export default withGeneralRateLimit(['POST'])(handler)
