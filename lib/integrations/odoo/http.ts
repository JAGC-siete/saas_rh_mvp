import { OdooTransportError } from './types'

export const ODOO_HTTP_TIMEOUT_MS = 25_000

export async function odooFetch(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ODOO_HTTP_TIMEOUT_MS)
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OdooTransportError(`Odoo request timed out after ${ODOO_HTTP_TIMEOUT_MS}ms`, 0, true)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
