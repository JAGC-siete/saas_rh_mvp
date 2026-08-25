import {
  OdooTransportError,
  isRetryableStatus,
  type OdooNamedArgs,
  type OdooTransport,
} from './types'
import { odooFetch } from './http'

type Json2Options = {
  baseUrl: string
  apiKey: string
  databaseName?: string | null
  fetchImpl?: typeof fetch
}

export function createJson2Client(opts: Json2Options): OdooTransport {
  const base = opts.baseUrl.replace(/\/+$/, '')
  const fetchImpl = opts.fetchImpl ?? fetch

  return {
    async call(model: string, method: string, namedArgs: OdooNamedArgs = {}) {
      const url = `${base}/json/2/${encodeURIComponent(model)}/${encodeURIComponent(method)}`
      const headers: Record<string, string> = {
        Authorization: `bearer ${opts.apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'humano-sisu-odoo-bridge',
      }
      if (opts.databaseName) {
        headers['X-Odoo-Database'] = opts.databaseName
      }

      let res: Response
      try {
        res = await odooFetch(fetchImpl, url, {
          method: 'POST',
          headers,
          body: JSON.stringify(namedArgs),
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'network error'
        throw new OdooTransportError(msg, 0, true)
      }

      const text = await res.text()
      let body: unknown = text
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = text
        }
      }

      if (!res.ok) {
        const message =
          typeof body === 'object' && body && 'message' in body
            ? String((body as { message: unknown }).message)
            : text || `HTTP ${res.status}`
        throw new OdooTransportError(message, res.status, isRetryableStatus(res.status))
      }

      return body
    },
  }
}
