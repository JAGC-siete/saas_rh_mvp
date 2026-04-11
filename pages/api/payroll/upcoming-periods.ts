import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { getUpcomingPeriods } from '../../../lib/payroll/period-dates'

function buildPeriodConfig(config: any, cutDates: any, qc: any, paymentFrequency: string) {
  return {
    payment_frequency: paymentFrequency as 'mensual' | 'quincenal' | 'semanal',
    monthly_type: cutDates?.monthly_type || 'standard',
    monthly_start: cutDates?.monthly_start ?? qc?.monthly_start ?? 1,
    monthly_end: cutDates?.monthly_end ?? qc?.monthly_end ?? 30,
    biweekly_type: cutDates?.biweekly_type || 'standard',
    biweekly_first_start: qc?.first_start ?? cutDates?.biweekly_first_start ?? 1,
    biweekly_first_end: qc?.first_end ?? cutDates?.biweekly_first_end ?? 15,
    biweekly_second_start: qc?.second_start ?? cutDates?.biweekly_second_start ?? 16,
    biweekly_second_end: qc?.second_end ?? cutDates?.biweekly_second_end ?? 30
  }
}

/**
 * GET /api/payroll/upcoming-periods?count=3
 * Retorna los próximos N periodos según la config guardada.
 *
 * POST /api/payroll/upcoming-periods
 * Body: { payment_frequency, payment_cut_dates, count? }
 * Retorna preview con config de draft (para UI antes de guardar).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    let periodConfig: any
    let count = 3

    if (req.method === 'POST' && req.body) {
      const { payment_frequency, payment_cut_dates, count: bodyCount } = req.body
      count = Math.min(Math.max(parseInt(bodyCount || '3', 10), 1), 12)
      const pf = payment_frequency === 'monthly' || payment_frequency === 'mensual' ? 'mensual' : payment_frequency === 'weekly' || payment_frequency === 'semanal' ? 'semanal' : 'quincenal'
      const cutDates = payment_cut_dates || {}
      const qc = cutDates.biweekly_first_start != null ? cutDates : null
      periodConfig = buildPeriodConfig(null, cutDates, qc, pf)
    } else {
      count = Math.min(Math.max(parseInt((req.query.count as string) || '3', 10), 1), 12)
      const { data: config } = await supabase
        .from('company_payroll_configs')
        .select('payment_frequency, quincena_config, metadata')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle()

      const meta = config?.metadata || {}
      const qc = config?.quincena_config as Record<string, number> | null
      const cutDates = meta?.payment_cut_dates || {}
      const pf = config?.payment_frequency || meta?.payment_frequency || 'quincenal'
      const paymentFrequency = pf === 'mensual' ? 'mensual' : pf === 'semanal' ? 'semanal' : 'quincenal'
      periodConfig = buildPeriodConfig(config, cutDates, qc, paymentFrequency)
    }

    const periods = getUpcomingPeriods(periodConfig, count)
    return res.status(200).json({ periods })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    console.error('Error fetching upcoming periods:', error)
    return res.status(500).json({ error: 'Error interno' })
  }
}
