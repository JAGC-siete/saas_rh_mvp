import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  assertCanManageOdoo,
  odooApiErrorResponse,
  OdooHttpError,
  resolveOdooCompanyId,
} from '../../../../lib/integrations/odoo/access'
import { publicConnectionView } from '../../../../lib/integrations/odoo/connection'
import { encryptOdooSecret, capOdooKeyExpiry } from '../../../../lib/integrations/odoo/crypto'
import type { OdooVersion } from '../../../../lib/integrations/odoo/types'

function parseVersion(value: unknown): OdooVersion {
  if (value === '18.0' || value === '19.0') return value
  throw new OdooHttpError('odoo_version debe ser 18.0 o 19.0', 400)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireCompanyAccess(req, res)
    assertCanManageOdoo(auth)

    if (req.method === 'GET') {
      const companyId = resolveOdooCompanyId(
        auth,
        typeof req.query.company_id === 'string' ? req.query.company_id : null
      )
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('odoo_connections')
        .select(
          'base_url, database_name, odoo_version, odoo_company_id, journal_code, odoo_login, enabled, key_expires_at, api_key_ciphertext'
        )
        .eq('company_id', companyId)
        .maybeSingle()

      if (!data) {
        return res.status(200).json({ configured: false })
      }
      return res.status(200).json(publicConnectionView(data))
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = req.body || {}
    const companyId = resolveOdooCompanyId(auth, body.company_id)
    const odooVersion = parseVersion(body.odoo_version)
    const baseUrl = typeof body.base_url === 'string' ? body.base_url.trim().replace(/\/+$/, '') : ''
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      return res.status(400).json({ error: 'base_url debe ser http(s)' })
    }

    const databaseName =
      typeof body.database_name === 'string' && body.database_name.trim()
        ? body.database_name.trim()
        : null
    const odooLogin =
      typeof body.odoo_login === 'string' && body.odoo_login.trim()
        ? body.odoo_login.trim()
        : null
    const journalCode =
      typeof body.journal_code === 'string' && body.journal_code.trim()
        ? body.journal_code.trim()
        : 'NOM'
    const odooCompanyId =
      body.odoo_company_id === null || body.odoo_company_id === ''
        ? null
        : Number.isFinite(Number(body.odoo_company_id))
          ? Number(body.odoo_company_id)
          : null

    if (odooVersion === '18.0' && (!databaseName || !odooLogin)) {
      return res.status(400).json({
        error: 'Odoo 18 requiere database_name y odoo_login para XML-RPC',
      })
    }

    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('odoo_connections')
      .select('id, api_key_ciphertext, key_expires_at')
      .eq('company_id', companyId)
      .maybeSingle()

    const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : ''
    if (!existing && !apiKey) {
      return res.status(400).json({ error: 'api_key es requerida' })
    }

    const row: Record<string, unknown> = {
      company_id: companyId,
      base_url: baseUrl,
      database_name: databaseName,
      odoo_version: odooVersion,
      odoo_company_id: odooCompanyId,
      journal_code: journalCode,
      odoo_login: odooLogin,
      enabled: Boolean(body.enabled),
      updated_at: new Date().toISOString(),
    }

    if (apiKey) {
      row.api_key_ciphertext = encryptOdooSecret(apiKey)
      row.key_expires_at = capOdooKeyExpiry(
        typeof body.key_expires_at === 'string' ? body.key_expires_at : null
      )
    } else if (typeof body.key_expires_at === 'string' && body.key_expires_at) {
      row.key_expires_at = capOdooKeyExpiry(body.key_expires_at)
    }

    const query = existing
      ? supabase.from('odoo_connections').update(row).eq('id', existing.id)
      : supabase.from('odoo_connections').insert(row)

    const { error } = await query
    if (error) {
      console.error('[odoo] connection upsert failed:', error.message)
      return res.status(500).json({ error: 'No se pudo guardar la conexión' })
    }

    const { data: saved } = await supabase
      .from('odoo_connections')
      .select(
        'base_url, database_name, odoo_version, odoo_company_id, journal_code, odoo_login, enabled, key_expires_at, api_key_ciphertext'
      )
      .eq('company_id', companyId)
      .single()

    return res.status(200).json({
      success: true,
      connection: saved ? publicConnectionView(saved) : null,
    })
  } catch (err) {
    return odooApiErrorResponse(res, err)
  }
}

export default withGeneralRateLimit(['GET', 'POST'])(handler)
