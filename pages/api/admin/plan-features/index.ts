import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

const INTERNAL_PLAN_KEYS = ['free_trial', 'basic', 'pro', 'enterprise'] as const
type InternalPlanKey = (typeof INTERNAL_PLAN_KEYS)[number]

function isInternalPlanKey(v: string): v is InternalPlanKey {
  return (INTERNAL_PLAN_KEYS as readonly string[]).includes(v)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = createAdminClient()

  try {
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      const [{ data: plans, error: e1 }, { data: features, error: e2 }, { data: links, error: e3 }] =
        await Promise.all([
          admin.from('plan_catalog').select('plan_key, name, description, is_active').order('plan_key'),
          admin.from('feature_catalog').select('feature_key, name, description').order('feature_key'),
          admin.from('plan_features').select('plan_key, feature_key'),
        ])

      if (e1 || e2 || e3) {
        console.error('plan-features GET', e1, e2, e3)
        return res.status(500).json({ error: 'Error al cargar catálogo de planes' })
      }

      return res.status(200).json({
        success: true,
        plans: plans || [],
        features: features || [],
        plan_features: links || [],
        commercial_to_internal_hint: {
          trial: 'free_trial',
          basic: 'basic',
          premium: 'pro',
          enterprise: 'enterprise',
        },
      })
    }

    if (req.method === 'PUT') {
      const body = req.body as { plan_key?: string; feature_keys?: string[] }
      const plan_key = typeof body.plan_key === 'string' ? body.plan_key.trim() : ''
      const feature_keys = Array.isArray(body.feature_keys) ? body.feature_keys : []

      if (!isInternalPlanKey(plan_key)) {
        return res.status(400).json({
          error: 'plan_key inválido',
          message: `Use uno de: ${INTERNAL_PLAN_KEYS.join(', ')}`,
        })
      }

      const normalized = [...new Set(feature_keys.map((k) => String(k).trim()).filter(Boolean))]
      if (normalized.length) {
        const { data: existing, error: exErr } = await admin
          .from('feature_catalog')
          .select('feature_key')
          .in('feature_key', normalized)

        if (exErr) {
          console.error('plan-features PUT validate features', exErr)
          return res.status(500).json({ error: 'Error validando módulos' })
        }

        const ok = new Set((existing || []).map((r: { feature_key: string }) => r.feature_key))
        const unknown = normalized.filter((k) => !ok.has(k))
        if (unknown.length) {
          return res.status(400).json({
            error: 'feature_keys desconocidos',
            unknown,
          })
        }
      }

      const { error: delErr } = await admin.from('plan_features').delete().eq('plan_key', plan_key)
      if (delErr) {
        console.error('plan-features PUT delete', delErr)
        return res.status(500).json({ error: 'Error al actualizar asignaciones' })
      }

      if (normalized.length) {
        const rows = normalized.map((feature_key) => ({ plan_key, feature_key }))
        const { error: insErr } = await admin.from('plan_features').insert(rows)
        if (insErr) {
          console.error('plan-features PUT insert', insErr)
          return res.status(500).json({ error: 'Error al guardar módulos del plan' })
        }
      }

      return res.status(200).json({
        success: true,
        plan_key,
        feature_keys: normalized,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    console.error('plan-features API', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
