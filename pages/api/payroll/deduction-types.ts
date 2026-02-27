import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'

/**
 * GET /api/payroll/deduction-types
 * Returns deduction fields with track_plazos from company payroll config.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId: authCompanyId, role } = await requireCompanyAccess(req, res)
    const companyId = authCompanyId ?? (req.query.company_id as string)
    if (!companyId) {
      return res.status(400).json({
        error: 'company_id es requerido',
        message: 'Debe especificar la empresa (company_id en query para super_admin)'
      })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para ver tipos de deducción'
      })
    }

    const { data: config, error } = await supabase
      .from('company_payroll_configs')
      .select('custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (error || !config?.custom_fields) {
      return res.status(200).json({ deduction_types: [] })
    }

    const customFields = config.custom_fields as Record<string, { label?: string; category?: string; track_plazos?: boolean }>
    const deductionTypes = Object.entries(customFields)
      .filter(([, def]) => def?.category === 'deductions' && def?.track_plazos === true)
      .map(([key, def]) => ({
        key,
        label: def?.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      }))

    return res.status(200).json({ deduction_types: deductionTypes })
  } catch (error: any) {
    console.error('Error en deduction-types:', error)
    return res.status(500).json({
      error: error?.message || 'Error interno del servidor'
    })
  }
}
