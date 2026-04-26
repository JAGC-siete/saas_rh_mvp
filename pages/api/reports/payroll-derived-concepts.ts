import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'

type DerivedConcept = {
  code: string
  label: string
  hasEmployerContrib: boolean
  kind: 'statutory' | 'employer_total' | 'custom'
  employeeSource?: { kind: 'run_line_column' | 'run_line_metadata_key'; key: string } | null
  employerSource?: { kind: 'run_line_metadata_key' | 'run_total_formula'; key: string } | null
}

/**
 * GET /api/reports/payroll-derived-concepts
 * Returns available derived concepts for the company.
 *
 * - Always includes IHSS/RAP/INFOP.
 * - Also includes any company custom fields (category=deductions) as configurable derived concepts,
 *   mapped to payroll_run_lines.metadata[field_key].
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const base: DerivedConcept[] = [
      {
        code: 'IHSS',
        label: 'IHSS',
        hasEmployerContrib: true,
        kind: 'statutory',
        employeeSource: { kind: 'run_line_column', key: 'eff_ihss' },
        employerSource: { kind: 'run_line_metadata_key', key: 'ihss_patronal' }
      },
      {
        code: 'RAP',
        label: 'RAP',
        hasEmployerContrib: true,
        kind: 'statutory',
        employeeSource: { kind: 'run_line_column', key: 'eff_rap' },
        employerSource: { kind: 'run_line_metadata_key', key: 'rap_patronal' }
      },
      {
        code: 'INFOP',
        label: 'INFOP (1% planilla bruta)',
        hasEmployerContrib: true,
        kind: 'employer_total',
        employeeSource: null,
        employerSource: { kind: 'run_total_formula', key: 'infop_total' }
      }
    ]

    // Load custom deduction fields from company_payroll_configs.custom_fields
    const { data: cpcRow } = await supabase
      .from('company_payroll_configs')
      .select('custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    const customFields = (cpcRow?.custom_fields || {}) as Record<string, any>
    const customConcepts: DerivedConcept[] = []
    for (const [fieldKey, def] of Object.entries(customFields)) {
      const category = typeof def === 'object' && def ? String((def as any).category || '') : ''
      if (category !== 'deductions') continue
      const label = typeof def === 'object' && def ? String((def as any).label || fieldKey) : fieldKey
      customConcepts.push({
        code: `CUSTOM_${fieldKey.toUpperCase()}`,
        label,
        hasEmployerContrib: false,
        kind: 'custom',
        employeeSource: { kind: 'run_line_metadata_key', key: fieldKey },
        employerSource: null
      })
    }

    return res.status(200).json({
      success: true,
      concepts: [...base, ...customConcepts]
    })
  } catch (e: any) {
    return res.status(e?.message === 'UNAUTHORIZED' ? 401 : 500).json({ error: e?.message || 'Internal server error' })
  }
}

