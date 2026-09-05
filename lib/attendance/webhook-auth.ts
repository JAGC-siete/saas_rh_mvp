import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { NextApiRequest } from 'next'

export const ATTENDANCE_WEBHOOK_TOKEN_HEADER = 'x-attendance-webhook-token'
export const ATTENDANCE_WEBHOOK_SIGNATURE_HEADER = 'x-attendance-signature'

const HASH_HEX_RE = /^[0-9a-f]{64}$/

export function generateAttendanceWebhookSecret(): string {
  return randomBytes(32).toString('hex')
}

export function hashAttendanceWebhookSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

export function signAttendanceWebhookBody(secret: string, rawBody: Buffer | string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex')
}

export function appendAttendanceWebhookToken(url: string, token: string): string {
  const parsed = new URL(url)
  parsed.searchParams.set('token', token)
  parsed.searchParams.delete('sig')
  return parsed.toString()
}

export function redactAttendanceWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.searchParams.has('token')) parsed.searchParams.set('token', '[redacted]')
    if (parsed.searchParams.has('sig')) parsed.searchParams.set('sig', '[redacted]')
    return parsed.toString()
  } catch {
    return '[unparseable-url]'
  }
}

function headerValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }
  return null
}

function stripSha256Prefix(raw: string): string {
  return raw.toLowerCase().startsWith('sha256=') ? raw.slice('sha256='.length) : raw
}

export function extractAttendanceWebhookToken(req: NextApiRequest): string | null {
  const header = headerValue(req.headers[ATTENDANCE_WEBHOOK_TOKEN_HEADER])
  if (header) return header
  const auth = headerValue(req.headers.authorization)
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    if (token) return token
  }
  const query = req.query.token
  if (typeof query === 'string' && query.trim()) return query.trim()
  return null
}

export function extractAttendanceWebhookSignature(req: NextApiRequest): string | null {
  const header = headerValue(req.headers[ATTENDANCE_WEBHOOK_SIGNATURE_HEADER])
  if (header) return stripSha256Prefix(header)
  const query = req.query.sig
  if (typeof query === 'string' && query.trim()) return stripSha256Prefix(query.trim())
  return null
}

export function companyAttendanceWebhookSecretHash(settings: unknown): string | null {
  if (settings == null || typeof settings !== 'object' || Array.isArray(settings)) return null
  const value = (settings as Record<string, unknown>).attendance_webhook_secret_hash
  if (typeof value !== 'string') return null
  const hash = value.trim().toLowerCase()
  return HASH_HEX_RE.test(hash) ? hash : null
}

function timingSafeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex')
  const b = Buffer.from(right, 'hex')
  if (a.length === 0 || a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export type AttendanceWebhookAuthFailure =
  | 'missing_token'
  | 'missing_signature'
  | 'invalid'

type AdminQueryClient = {
  from: (table: string) => any
}

export async function resolveStoredAttendanceWebhookSecretHash(
  admin: AdminQueryClient,
  companyId: string,
  presentedToken: string | null
): Promise<string | null> {
  if (!presentedToken) return null
  const presentedHash = hashAttendanceWebhookSecret(presentedToken)
  const { data: device } = await admin
    .from('devices')
    .select('webhook_secret_hash')
    .eq('company_id', companyId)
    .eq('webhook_secret_hash', presentedHash)
    .maybeSingle()
  if (typeof device?.webhook_secret_hash === 'string' && HASH_HEX_RE.test(device.webhook_secret_hash)) {
    return device.webhook_secret_hash.toLowerCase()
  }
  const { data: company } = await admin
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .maybeSingle()
  return companyAttendanceWebhookSecretHash(company?.settings)
}

export function issueAttendanceWebhookSecret(): { token: string; hash: string } {
  const token = generateAttendanceWebhookSecret()
  return { token, hash: hashAttendanceWebhookSecret(token) }
}

export function verifyAttendanceWebhookAuth(opts: {
  presentedToken: string | null
  presentedSignature: string | null
  storedSecretHash: string | null
  rawBody: Buffer
}): { ok: true } | { ok: false; reason: AttendanceWebhookAuthFailure } {
  // Legacy Hikvision httpHosts: URL is only ?company_id=. No token → allow.
  // If a token is sent, it must match the stored hash (401 on mismatch).
  if (!opts.presentedToken) return { ok: true }

  if (!opts.storedSecretHash || !HASH_HEX_RE.test(opts.storedSecretHash)) {
    return { ok: false, reason: 'invalid' }
  }

  const presentedHash = hashAttendanceWebhookSecret(opts.presentedToken)
  if (!timingSafeEqualHex(presentedHash, opts.storedSecretHash.toLowerCase())) {
    return { ok: false, reason: 'invalid' }
  }

  if (opts.presentedSignature) {
    const expected = signAttendanceWebhookBody(opts.presentedToken, opts.rawBody)
    const presented = opts.presentedSignature.trim().toLowerCase()
    if (!HASH_HEX_RE.test(presented) || !timingSafeEqualHex(presented, expected)) {
      return { ok: false, reason: 'invalid' }
    }
  }

  return { ok: true }
}
