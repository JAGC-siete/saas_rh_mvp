import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../../lib/security/rate-limiting'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  assertCanManageOdoo,
  odooApiErrorResponse,
  resolveOdooCompanyId,
} from '../../../../lib/integrations/odoo/access'
import {
  decryptConnectionRow,
  isOdooKeyExpired,
  loadOdooConnectionRow,
} from '../../../../lib/integrations/odoo/connection'
import { createOdooTransport } from '../../../../lib/integrations/odoo/factory'

async function pullOdooAccounts(companyId: string) {
  const row = await loadOdooConnectionRow(companyId)
  if (!row) {
    return { error: 'Guarde la conexión Odoo primero', status: 400 as const, accounts: [] }
  }
  const conn = decryptConnectionRow(row)
  if (isOdooKeyExpired(conn.keyExpiresAt)) {
    return { error: 'La API key de Odoo está vencida', status: 400 as const, accounts: [] }
  }
  const transport = createOdooTransport(conn)
  const domain = conn.odooCompanyId ? [['company_id', '=', conn.odooCompanyId]] : []
  const pageSize = 200
  const maxRows = 4000
  const accounts: Array<{ code: string; name: string }> = []
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const raw = await transport.call('account.account', 'search_read', {
      domain,
      fields: ['code', 'name'],
      limit: pageSize,
      offset,
    })
    const list = Array.isArray(raw) ? raw : []
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const rec = item as { code?: unknown; name?: unknown }
      if (typeof rec.code !== 'string') continue
      accounts.push({
        code: rec.code,
        name: typeof rec.name === 'string' ? rec.name : rec.code,
      })
    }
    if (list.length < pageSize) break
  }
  return { accounts, status: 200 as const }
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
      const [{ data: sisuAccounts }, { data: mappings }] = await Promise.all([
        supabase
          .from('chart_of_accounts')
          .select('id, code, name')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('code'),
        supabase
          .from('odoo_account_map')
          .select('id, sisu_account_id, odoo_account_code')
          .eq('company_id', companyId),
      ])

      let odooAccounts: Array<{ code: string; name: string }> | undefined
      if (req.query.pull === '1' || req.query.pull === 'true') {
        const pulled = await pullOdooAccounts(companyId)
        if (pulled.error) {
          return res.status(pulled.status).json({ error: pulled.error })
        }
        odooAccounts = pulled.accounts
      }

      return res.status(200).json({
        sisu_accounts: sisuAccounts ?? [],
        mappings: mappings ?? [],
        odoo_accounts: odooAccounts ?? [],
      })
    }

    if (req.method !== 'PUT') {
      res.setHeader('Allow', ['GET', 'PUT'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = req.body || {}
    const companyId = resolveOdooCompanyId(auth, body.company_id)
    const mappings = Array.isArray(body.mappings) ? body.mappings : []
    const supabase = createAdminClient()

    for (const item of mappings) {
      const sisuAccountId = typeof item?.sisu_account_id === 'string' ? item.sisu_account_id : ''
      const code =
        typeof item?.odoo_account_code === 'string' ? item.odoo_account_code.trim() : ''
      if (!sisuAccountId) continue
      if (!code) {
        await supabase
          .from('odoo_account_map')
          .delete()
          .eq('company_id', companyId)
          .eq('sisu_account_id', sisuAccountId)
        continue
      }
      const { error } = await supabase.from('odoo_account_map').upsert(
        {
          company_id: companyId,
          sisu_account_id: sisuAccountId,
          odoo_account_code: code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,sisu_account_id' }
      )
      if (error) {
        console.error('[odoo] account-map upsert failed:', error.message)
        return res.status(500).json({ error: 'No se pudo guardar el mapa de cuentas' })
      }
    }

    const { data: saved } = await supabase
      .from('odoo_account_map')
      .select('id, sisu_account_id, odoo_account_code')
      .eq('company_id', companyId)

    return res.status(200).json({ success: true, mappings: saved ?? [] })
  } catch (err) {
    return odooApiErrorResponse(res, err)
  }
}

export default withGeneralRateLimit(['GET', 'PUT'])(handler)
