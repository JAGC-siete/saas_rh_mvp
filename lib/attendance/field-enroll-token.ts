/**
 * One-time enroll tokens for field WebAuthn device binding.
 * HR issues token; public enroll consumes it. DNI alone is not sufficient to enroll.
 */

import crypto from 'crypto'
import { createAdminClient } from '../supabase/server'
import { logger } from '../logger'

const ENROLL_TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_ACTIVE_CREDENTIALS = 1

export { MAX_ACTIVE_CREDENTIALS }

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

export function generateEnrollTokenPlaintext(): string {
  return crypto.randomBytes(24).toString('base64url')
}

export async function issueFieldEnrollToken(params: {
  employeeId: string
  companyId: string
  createdBy: string
}): Promise<{ token: string; expiresAt: string }> {
  const supabase = createAdminClient()
  const token = generateEnrollTokenPlaintext()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + ENROLL_TOKEN_TTL_MS).toISOString()

  // Invalidate prior unused tokens for this employee
  await supabase
    .from('field_enroll_tokens' as any)
    .update({ consumed_at: new Date().toISOString() } as any)
    .eq('employee_id', params.employeeId)
    .is('consumed_at', null)

  const { error } = await supabase.from('field_enroll_tokens' as any).insert({
    employee_id: params.employeeId,
    company_id: params.companyId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: params.createdBy,
  } as any)

  if (error) {
    logger.error('Failed to issue field enroll token', error)
    throw new Error('No se pudo emitir token de vinculación')
  }

  return { token, expiresAt }
}

export type EnrollTokenConsumeResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

/**
 * Validates token without consuming (options step). Consumption happens on successful enroll.
 */
export async function peekFieldEnrollToken(params: {
  employeeId: string
  companyId: string
  token: string
}): Promise<EnrollTokenConsumeResult> {
  const token = typeof params.token === 'string' ? params.token.trim() : ''
  if (!token) {
    return {
      ok: false,
      code: 'ENROLL_TOKEN_REQUIRED',
      message: 'Se requiere un token de vinculación emitido por RR.HH.',
    }
  }

  const supabase = createAdminClient()
  const tokenHash = hashToken(token)
  const { data, error } = await supabase
    .from('field_enroll_tokens' as any)
    .select('id, expires_at, consumed_at, company_id, employee_id')
    .eq('token_hash', tokenHash)
    .eq('employee_id', params.employeeId)
    .is('consumed_at', null)
    .maybeSingle()

  if (error || !data) {
    return {
      ok: false,
      code: 'ENROLL_TOKEN_INVALID',
      message: 'Token de vinculación inválido o ya usado.',
    }
  }

  const row = data as {
    id: string
    expires_at: string
    company_id: string
  }

  if (row.company_id !== params.companyId) {
    return {
      ok: false,
      code: 'ENROLL_TOKEN_INVALID',
      message: 'Token de vinculación inválido.',
    }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      code: 'ENROLL_TOKEN_EXPIRED',
      message: 'Token de vinculación expirado. Solicita uno nuevo a RR.HH.',
    }
  }

  return { ok: true }
}

/**
 * Atomically consume enroll token. Returns false if already used / invalid.
 */
export async function consumeFieldEnrollToken(params: {
  employeeId: string
  companyId: string
  token: string
}): Promise<EnrollTokenConsumeResult> {
  const peek = await peekFieldEnrollToken(params)
  if (!peek.ok) return peek

  const supabase = createAdminClient()
  const tokenHash = hashToken(params.token.trim())
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('field_enroll_tokens' as any)
    .update({ consumed_at: nowIso } as any)
    .eq('token_hash', tokenHash)
    .eq('employee_id', params.employeeId)
    .eq('company_id', params.companyId)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    return {
      ok: false,
      code: 'ENROLL_TOKEN_INVALID',
      message: 'Token de vinculación inválido o ya usado.',
    }
  }

  return { ok: true }
}

export async function revokeActiveCredentials(params: {
  employeeId: string
  companyId: string
}): Promise<number> {
  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('employee_device_credentials' as any)
    .update({ revoked_at: nowIso } as any)
    .eq('employee_id', params.employeeId)
    .eq('company_id', params.companyId)
    .is('revoked_at', null)
    .select('id')

  if (error) {
    logger.error('Failed to revoke field credentials', error)
    throw new Error('No se pudo revocar credenciales')
  }

  return (data || []).length
}
