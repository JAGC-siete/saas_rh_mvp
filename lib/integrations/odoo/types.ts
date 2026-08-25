export type OdooVersion = '18.0' | '19.0'

export type OdooNamedArgs = Record<string, unknown>

export interface OdooTransport {
  call(model: string, method: string, namedArgs?: OdooNamedArgs): Promise<unknown>
}

export class OdooTransportError extends Error {
  readonly statusCode: number
  readonly retryable: boolean

  constructor(message: string, statusCode: number, retryable: boolean) {
    super(sanitizeOdooErrorMessage(message))
    this.name = 'OdooTransportError'
    this.statusCode = statusCode
    this.retryable = retryable
  }
}

export function sanitizeOdooErrorMessage(message: string): string {
  return message
    .replace(/bearer\s+[A-Za-z0-9+/=_-]+/gi, 'bearer [redacted]')
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[redacted]')
}

export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429 || status === 0
}

export type DecryptedOdooConnection = {
  id: string
  companyId: string
  baseUrl: string
  databaseName: string | null
  odooVersion: OdooVersion
  odooCompanyId: number | null
  journalCode: string
  odooLogin: string | null
  apiKey: string
  enabled: boolean
  keyExpiresAt: string | null
}
