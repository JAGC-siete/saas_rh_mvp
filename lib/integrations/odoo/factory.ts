import { createJson2Client } from './json2-client'
import { createXmlRpcClient } from './xmlrpc-client'
import { OdooTransportError, type DecryptedOdooConnection, type OdooTransport } from './types'

export function createOdooTransport(
  conn: DecryptedOdooConnection,
  fetchImpl?: typeof fetch
): OdooTransport {
  if (conn.odooVersion === '19.0') {
    return createJson2Client({
      baseUrl: conn.baseUrl,
      apiKey: conn.apiKey,
      databaseName: conn.databaseName,
      fetchImpl,
    })
  }
  if (conn.odooVersion === '18.0') {
    if (!conn.databaseName) {
      throw new OdooTransportError('database_name is required for Odoo 18 XML-RPC', 400, false)
    }
    if (!conn.odooLogin) {
      throw new OdooTransportError('odoo_login is required for Odoo 18 XML-RPC', 400, false)
    }
    return createXmlRpcClient({
      baseUrl: conn.baseUrl,
      apiKey: conn.apiKey,
      databaseName: conn.databaseName,
      login: conn.odooLogin,
      fetchImpl,
    })
  }
  throw new OdooTransportError(`Unsupported odoo_version: ${conn.odooVersion}`, 400, false)
}
