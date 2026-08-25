import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../../lib/security/rate-limiting'
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
import { xmlRpcAuthenticate } from '../../../../lib/integrations/odoo/xmlrpc-client'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireCompanyAccess(req, res)
    assertCanManageOdoo(auth)
    const companyId = resolveOdooCompanyId(auth, req.body?.company_id)
    const row = await loadOdooConnectionRow(companyId)
    if (!row) {
      return res.status(400).json({ error: 'Guarde la conexión Odoo primero' })
    }

    const conn = decryptConnectionRow(row)
    if (isOdooKeyExpired(conn.keyExpiresAt)) {
      return res.status(400).json({ error: 'La API key de Odoo está vencida. Rótala (máx. 3 meses).' })
    }

    if (conn.odooVersion === '18.0') {
      if (!conn.databaseName || !conn.odooLogin) {
        return res.status(400).json({ error: 'Odoo 18 requiere database_name y odoo_login' })
      }
      const uid = await xmlRpcAuthenticate({
        baseUrl: conn.baseUrl,
        apiKey: conn.apiKey,
        databaseName: conn.databaseName,
        login: conn.odooLogin,
      })
      return res.status(200).json({ success: true, transport: 'xmlrpc', uid })
    }

    const transport = createOdooTransport(conn)
    const context = await transport.call('res.users', 'context_get', {})
    return res.status(200).json({ success: true, transport: 'json2', context })
  } catch (err) {
    return odooApiErrorResponse(res, err)
  }
}

export default withGeneralRateLimit(['POST'])(handler)
