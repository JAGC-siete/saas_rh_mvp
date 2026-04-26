import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'

type SaveBody = {
  field_key: string
  concept_code: string | null
  concept_label?: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    if (!['super_admin', 'company_admin', 'hr_manager', 'manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    if (req.method === 'GET') {
      // Custom deductions available for mapping
      const { data: cpcRow } = await supabase
        .from('company_payroll_configs')
        .select('custom_fields')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle()

      const customFields = (cpcRow?.custom_fields || {}) as Record<string, any>
      const deductions = Object.entries(customFields)
        .filter(([, def]) => typeof def === 'object' && def && String((def as any).category || '') === 'deductions')
        .map(([fieldKey, def]) => ({
          field_key: fieldKey,
          label: String((def as any).label || fieldKey)
        }))
        .sort((a, b) => a.label.localeCompare(b.label))

      const { data: concepts, error: cErr } = await supabase
        .from('payroll_derived_concepts')
        .select('id, code, label, has_employer_contrib, active')
        .eq('company_id', companyId)
        .order('label')

      if (cErr) return res.status(500).json({ error: 'Error leyendo conceptos derivados', details: cErr.message })

      const conceptById = new Map((concepts || []).map((c: any) => [c.id, c]))

      const { data: sources, error: sErr } = await supabase
        .from('payroll_derived_concept_sources')
        .select('id, concept_id, source_kind, employee_source')
        .eq('company_id', companyId)
        .eq('source_kind', 'run_line_metadata_key')

      if (sErr) return res.status(500).json({ error: 'Error leyendo mapeos', details: sErr.message })

      const mappings = (sources || [])
        .map((s: any) => ({
          id: s.id,
          field_key: s.employee_source,
          concept_code: conceptById.get(s.concept_id)?.code || null,
          concept_label: conceptById.get(s.concept_id)?.label || null
        }))
        .filter((m: any) => typeof m.field_key === 'string' && m.field_key.length > 0)

      return res.status(200).json({
        concepts: concepts || [],
        deductions,
        mappings
      })
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as SaveBody
      const fieldKey = String(body.field_key || '').trim()
      const conceptCodeRaw = body.concept_code

      if (!fieldKey) return res.status(400).json({ error: 'field_key es requerido' })
      if (fieldKey === '__noop__') {
        return res.status(400).json({ error: 'field_key inválido' })
      }

      // Delete mapping (set to null)
      if (!conceptCodeRaw) {
        const { error: delErr } = await supabase
          .from('payroll_derived_concept_sources')
          .delete()
          .eq('company_id', companyId)
          .eq('source_kind', 'run_line_metadata_key')
          .eq('employee_source', fieldKey)
        if (delErr) return res.status(500).json({ error: 'Error eliminando mapeo', details: delErr.message })
        return res.status(200).json({ success: true })
      }

      const conceptCode = String(conceptCodeRaw).trim().toUpperCase()
      if (!/^[A-Z0-9_]{2,64}$/.test(conceptCode)) {
        return res.status(400).json({ error: 'concept_code inválido (A-Z0-9_)' })
      }

      // Ensure concept exists
      let conceptId: string | null = null
      const { data: existingConcept } = await supabase
        .from('payroll_derived_concepts')
        .select('id')
        .eq('company_id', companyId)
        .eq('code', conceptCode)
        .maybeSingle()

      if (existingConcept?.id) {
        conceptId = existingConcept.id
      } else {
        const label = String(body.concept_label || conceptCode).slice(0, 120)
        const { data: inserted, error: insErr } = await supabase
          .from('payroll_derived_concepts')
          .insert({
            company_id: companyId,
            code: conceptCode,
            label,
            has_employer_contrib: false,
            active: true
          })
          .select('id')
          .single()
        if (insErr || !inserted) {
          return res.status(500).json({ error: 'Error creando concepto', details: insErr?.message })
        }
        conceptId = inserted.id
      }

      // Replace mapping for this field_key (avoid duplicates)
      await supabase
        .from('payroll_derived_concept_sources')
        .delete()
        .eq('company_id', companyId)
        .eq('source_kind', 'run_line_metadata_key')
        .eq('employee_source', fieldKey)

      const { error: mapErr } = await supabase
        .from('payroll_derived_concept_sources')
        .insert({
          company_id: companyId,
          concept_id: conceptId,
          source_kind: 'run_line_metadata_key',
          employee_source: fieldKey,
          employer_source: null
        })

      if (mapErr) return res.status(500).json({ error: 'Error guardando mapeo', details: mapErr.message })

      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    return res.status(err?.message === 'UNAUTHORIZED' ? 401 : 500).json({ error: err?.message || 'Internal server error' })
  }
}

export default withGeneralRateLimit(['GET', 'POST'])(handler)

