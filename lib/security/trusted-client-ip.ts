import type { IncomingMessage } from 'http'
import { isIPv4, isIPv6 } from 'net'

/**
 * Resolves the client IP for rate limiting and logging when behind a reverse proxy.
 *
 * Railway edge appends the real client to X-Forwarded-For; spoofed values appear
 * to the left. Use the rightmost hop when TRUST_PROXY is enabled.
 * @see https://station.railway.com/questions/edge-proxy-x-forwarded-for-and-x-real-ip-c5a50049
 *
 * Env:
 * - TRUST_PROXY=0|false — ignore X-Forwarded-For / X-Real-Ip (direct socket only). Default in dev.
 * - TRUST_PROXY=1|true — trust forwarded headers (default when RAILWAY_ENVIRONMENT, VERCEL, or FLY_APP_NAME is set).
 * - XFF_CLIENT_POSITION=first — use leftmost XFF hop (some stacks replace the whole header).
 * - XFF_CLIENT_POSITION=last (default) — use rightmost hop (Railway append semantics).
 * - TRUST_CF_CONNECTING_IP=1 — prefer CF-Connecting-Ip when present (Cloudflare in front).
 */

type RequestWithSocket = IncomingMessage & {
  socket?: { remoteAddress?: string | null }
  connection?: { remoteAddress?: string | null }
}

function envTruthy(v: string | undefined): boolean {
  return v === '1' || v?.toLowerCase() === 'true'
}

function envFalsy(v: string | undefined): boolean {
  return v === '0' || v?.toLowerCase() === 'false'
}

export function trustProxyEnabled(): boolean {
  if (envFalsy(process.env.TRUST_PROXY)) return false
  if (envTruthy(process.env.TRUST_PROXY)) return true
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL ||
    process.env.FLY_APP_NAME
  )
}

function xffClientIsFirstHop(): boolean {
  return process.env.XFF_CLIENT_POSITION === 'first'
}

export function normalizeClientIp(ip: string | undefined | null): string {
  if (!ip) return 'unknown'
  const t = ip.trim()
  if (!t) return 'unknown'
  if (t.startsWith('::ffff:')) return t.slice(7)
  return t
}

function isPlausibleIp(s: string): boolean {
  return isIPv4(s) || isIPv6(s)
}

function parseXffList(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  const raw = Array.isArray(value) ? value.join(',') : value
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function pickFromXff(ips: string[]): string | null {
  if (ips.length === 0) return null
  const raw = xffClientIsFirstHop() ? ips[0] : ips[ips.length - 1]
  const ip = normalizeClientIp(raw)
  return isPlausibleIp(ip) ? ip : null
}

function socketRemote(req: RequestWithSocket): string {
  const raw =
    req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? undefined
  const ip = normalizeClientIp(raw ?? null)
  return isPlausibleIp(ip) ? ip : 'unknown'
}

/**
 * Client IP safe for rate limiting: never trusts X-Forwarded-For unless TRUST_PROXY is on.
 */
export function getTrustedClientIp(req: RequestWithSocket): string {
  const fallback = socketRemote(req)

  if (!trustProxyEnabled()) {
    return fallback
  }

  if (envTruthy(process.env.TRUST_CF_CONNECTING_IP)) {
    const cf = req.headers['cf-connecting-ip']
    const v = Array.isArray(cf) ? cf[0] : cf
    const ip = normalizeClientIp(v ?? null)
    if (isPlausibleIp(ip)) return ip
  }

  const xff = pickFromXffList(req.headers['x-forwarded-for'])
  if (xff) return xff

  const realIp = req.headers['x-real-ip']
  if (realIp) {
    const last = Array.isArray(realIp) ? realIp[realIp.length - 1] : realIp
    const ip = normalizeClientIp(last)
    if (isPlausibleIp(ip)) return ip
  }

  return fallback
}

function pickFromXffList(
  value: string | string[] | undefined
): string | null {
  const ips = parseXffList(value)
  return pickFromXff(ips)
}
