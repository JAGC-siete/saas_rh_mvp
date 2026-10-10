import { NextApiRequest, NextApiResponse } from 'next'
import { requireAccountingAccess } from '../../../lib/accounting/api-access'
import { createAdminClient } from '../../../lib/supabase/server'
import {
  calculateProvisionVacaciones,
  calculateProvisionCesantia
} from '../../../lib/payroll/labor-provisions'
import {
  allocateSeverance,
  buildSeveranceJournalEntry,
  centsToAmount,
  toCents
} from '../../../lib/accounting/journal-builder'
import {
  loadConceptMappings,
  persistJournalEntry
} from '../../../lib/accounting/journal-generator'
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
    const auth = await requireAccountingAccess(req, res)
    if (!auth) return
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

    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('company_id', companyId)
      .neq('status', 'void')
      .contains('source_reference', { type: 'severance', employee_id, termination_date })
      .limit(1)

    if (existing?.length) {
      return res.status(409).json({
        error: 'Esta liquidación ya tiene su asiento contable. Puedes verlo o exportarlo en Contabilidad.'
      })
    }

    const loaded = await loadConceptMappings(supabase, companyId)
    if ('error' in loaded) {
      return res.status(400).json({ error: loaded.error })
    }

    const empName = (calc.employee_name as string) || 'Empleado'
    const requested = {
      settlementCents: toCents(totalSettlement),
      provVacCents: toCents(Math.min(vacationBalance, monthsTotal * monthlyProvVac)),
      provCesCents: toCents(Math.min(severanceAmount, monthsTotal * monthlyProvCes))
    }
    const built = buildSeveranceJournalEntry({
      description: `Liquidación - ${empName} - ${termination_date}`,
      ...requested,
      mappings: loaded.mappings,
      conceptNames: loaded.conceptNames
    })
    if (!built.ok) {
      return res.status(400).json({ error: built.error })
    }

    const allocation = allocateSeverance(requested)
    const provisionedVacaciones = centsToAmount(allocation.provVac)
    const provisionedCesantia = centsToAmount(allocation.provCes)
    const excessNotProvisioned = centsToAmount(allocation.excess)

    const saved = await persistJournalEntry(
      supabase,
      {
        company_id: companyId,
        payroll_run_id: null,
        entry_date: termination_date,
        currency: 'HNL',
        exchange_rate: 1,
        status: 'draft',
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
      },
      built.entries[0]
    )

    if ('error' in saved) {
      return res.status(500).json({
        error: 'Error creando partida contable',
        details: saved.error
      })
    }
    const je = saved

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
