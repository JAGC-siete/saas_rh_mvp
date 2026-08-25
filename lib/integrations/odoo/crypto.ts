import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const PREFIX = 'v1'

function keyBytes(): Buffer {
  const raw = process.env.ODOO_SECRETS_KEY
  if (!raw || raw.trim().length === 0) {
    throw new Error('ODOO_SECRETS_KEY is not configured')
  }
  const trimmed = raw.trim()
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex')
  }
  return createHash('sha256').update(trimmed, 'utf8').digest()
}

export function encryptOdooSecret(plain: string): string {
  const key = keyBytes()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export const ODOO_KEY_MAX_TTL_MS = 90 * 24 * 60 * 60 * 1000

export function capOdooKeyExpiry(iso?: string | null): string {
  const maxTs = Date.now() + ODOO_KEY_MAX_TTL_MS
  const requested = iso ? Date.parse(iso) : Number.NaN
  const ts = Number.isFinite(requested) ? Math.min(requested, maxTs) : maxTs
  return new Date(ts).toISOString()
}

export function decryptOdooSecret(stored: string): string {
  const key = keyBytes()
  const parts = stored.split(':')
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('Invalid Odoo secret ciphertext')
  }
  const iv = Buffer.from(parts[1], 'base64')
  const tag = Buffer.from(parts[2], 'base64')
  const ciphertext = Buffer.from(parts[3], 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
