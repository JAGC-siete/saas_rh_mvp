import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { loadPayrollDerivedMappingsPayload } from '../../../lib/accounting/payroll-derived-mappings'
import { withPayrollRateLimit } from '../../../lib/security/rate-limiting'

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
      try {
        const payload = await loadPayrollDerivedMappingsPayload(supabase, companyId)
        return res.status(200).json(payload)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error leyendo datos'
        return res.status(500).json({ error: 'Error leyendo conceptos derivados', details: message })
      }
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as SaveBody
      const fieldKey = String(body.field_key || '').trim()
      const conceptCodeRaw = body.concept_code

      if (!fieldKey) return res.status(400).json({ error: 'field_key es requerido' })
      if (fieldKey === '__noop__') {
        return res.status(400).json({ error: 'field_key inválido' })
      }

      if (!conceptCodeRaw) {
        const { error: delErr } = await supabase
          .from('payroll_derived_concept_sources')
          .delete()
          .eq('company_id', companyId)
          .eq('source_kind', 'run_line_metadata_key')
          .eq('employee_source', fieldKey)
        if (delErr) return res.status(500).json({ error: 'Error eliminando mapeo', details: delErr.message })
      } else {
        const conceptCode = String(conceptCodeRaw).trim().toUpperCase()
        if (!/^[A-Z0-9_]{2,64}$/.test(conceptCode)) {
          return res.status(400).json({ error: 'concept_code inválido (A-Z0-9_)' })
        }

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
      }

      try {
        const payload = await loadPayrollDerivedMappingsPayload(supabase, companyId)
        return res.status(200).json({ success: true, ...payload })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error leyendo datos'
        return res.status(500).json({ error: 'Mapeo guardado pero falló la recarga', details: message })
      }
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return res.status(message === 'UNAUTHORIZED' ? 401 : 500).json({ error: message })
  }
}

export default withPayrollRateLimit(['GET', 'POST'])(handler)
