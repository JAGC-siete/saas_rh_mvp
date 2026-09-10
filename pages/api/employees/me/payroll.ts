import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../lib/employee-portal/company-settings'
import {
  loadCompanyPortalPayrollTipo,
  mapReleasedRunLineToPortalItem,
  PORTAL_RELEASED_STATUSES,
  type PortalPayrollListItem,
} from '../../../../lib/employee-portal/released-payroll'
import { resolveRunLineDisplayNet } from '../../../../lib/payroll/resolve-run-line-display-net'
import { normalizeCountryCode } from '../../../../lib/country/supported'

interface PayrollResponse {
  items: PortalPayrollListItem[]
  employeeName?: string
  currentPeriod: {
    year: number
    month: number
  }
  summary: {
    totalRecords: number
    lastPayment?: string
    lastAmount?: number
    countryCode?: string
  }
}

interface ErrorResponse {
  error: string
  debug?: unknown
  details?: unknown
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PayrollResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const ctx = await resolveEmployeeAndCompanyId(supabase, user)
    if (!ctx) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }
    if (!(await assertEmployeePortalEnabled(supabase, ctx.companyId, res))) {
      return
    }

    const { employeeId, companyId } = ctx
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const fromMonth = currentMonth - 5
    const fromYear = fromMonth <= 0 ? currentYear - 1 : currentYear
    const normalizedFromMonth = fromMonth <= 0 ? fromMonth + 12 : fromMonth

    const companyTipo = await loadCompanyPortalPayrollTipo(supabase, companyId)

    const { data: runLines, error: runLinesError } = await supabase
      .from('payroll_run_lines')
      .select(
        `
        id,
        eff_bruto,
        eff_neto,
        eff_ihss,
        eff_rap,
        eff_isr,
        eff_hours,
        metadata,
        created_at,
        payroll_runs!inner(
          year,
          month,
          quincena,
          status,
          tipo
        )
      `
      )
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .eq('payroll_runs.tipo', companyTipo)
      .in('payroll_runs.status', [...PORTAL_RELEASED_STATUSES])
      .order('created_at', { ascending: false })
      .limit(24)

    if (runLinesError) {
      logger.error('Portal payroll list query failed', {
        error: runLinesError.message,
        employeeId,
      })
      return res.status(500).json({ error: 'Error cargando recibos' })
    }

    const mapped = (runLines || [])
      .map((row) => mapReleasedRunLineToPortalItem(row as any, { companyTipo }))
      .filter((item): item is PortalPayrollListItem => item != null)
      .filter((item) => {
        if (item.year > fromYear) return true
        if (item.year < fromYear) return false
        return item.month >= normalizedFromMonth
      })
      .slice(0, 12)

    const items: PortalPayrollListItem[] = []
    for (const item of mapped) {
      const raw = (runLines || []).find((r: { id: string }) => r.id === item.runLineId) as
        | {
            eff_bruto?: number
            eff_ihss?: number
            eff_rap?: number
            eff_isr?: number
            eff_neto?: number
            metadata?: Record<string, unknown> | null
          }
        | undefined
      if (!raw) {
        items.push(item)
        continue
      }
      const displayNet = await resolveRunLineDisplayNet(companyId, raw, supabase)
      items.push({ ...item, eff_neto: displayNet })
    }

    if (items.length === 0) {
      return res.status(404).json({
        error: 'No payroll data found for this period',
        debug: { employeeId, currentYear, currentMonth },
      })
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('name')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .maybeSingle()

    const { data: companyRow } = await supabase
      .from('companies')
      .select('country_code')
      .eq('id', companyId)
      .maybeSingle()

    const newest = items[0]
    const newestRaw = (runLines || []).find((r: { id: string }) => r.id === newest.runLineId) as
      | { created_at?: string }
      | undefined

    return res.status(200).json({
      items,
      employeeName: employee?.name,
      currentPeriod: {
        year: currentYear,
        month: currentMonth,
      },
      summary: {
        totalRecords: items.length,
        lastPayment: newestRaw?.created_at,
        lastAmount: newest.eff_neto,
        countryCode: normalizeCountryCode(companyRow?.country_code),
      },
    })
  } catch (error) {
    logger.error('API error fetching employee payroll', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
