/**
 * Field mobile WebAuthn helpers (platform authenticator: Face ID / Touch ID / Android Biometric).
 * Server stores public key + credential_id only — never biometric templates.
 */

import type { NextApiRequest } from 'next'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type AuthenticatorTransport,
} from '@simplewebauthn/server'
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server'
import { createAdminClient } from '../supabase/server'
import { logger } from '../logger'
import { MAX_ACTIVE_CREDENTIALS } from './field-enroll-token'

const CHALLENGE_TTL_MS = 5 * 60 * 1000

export type WebAuthnRelyingParty = {
  rpID: string
  rpName: string
  origin: string
}

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
}

/**
 * Production: WEBAUTHN_RP_ID + NEXT_PUBLIC_SITE_URL are required (no Host-header RP).
 * Localhost: derive from request for dev convenience.
 */
export function resolveWebAuthnRp(req: NextApiRequest): WebAuthnRelyingParty {
  const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost').toString()
  const host = hostHeader.split(',')[0].trim().split(':')[0]
  const rpName = process.env.WEBAUTHN_RP_NAME || 'Humano SISU'

  if (isLocalHost(host)) {
    const protoHeader = (req.headers['x-forwarded-proto'] || '').toString()
    const proto = protoHeader.split(',')[0].trim() || 'http'
    const origin = `${proto}://${hostHeader.split(',')[0].trim()}`
    return { rpID: host, rpName, origin }
  }

  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const envRpId = process.env.WEBAUTHN_RP_ID?.trim()

  if (!envOrigin || !envRpId) {
    throw new Error(
      'WEBAUTHN_RP_ID y NEXT_PUBLIC_SITE_URL son obligatorios fuera de localhost'
    )
  }

  let originHost: string
  try {
    originHost = new URL(envOrigin).hostname
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL inválida')
  }

  if (envRpId !== originHost && !originHost.endsWith(`.${envRpId}`)) {
    logger.warn('WEBAUTHN_RP_ID does not match NEXT_PUBLIC_SITE_URL host', {
      envRpId,
      originHost,
    })
  }

  return {
    rpID: envRpId,
    rpName,
    origin: envOrigin,
  }
}

function b64urlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

export type DeviceCredentialRow = {
  id: string
  employee_id: string
  company_id: string
  credential_id: string
  public_key: string
  counter: number
  transports: string[] | null
  revoked_at: string | null
}

async function storeChallenge(params: {
  employeeId: string
  companyId: string
  challenge: string
  purpose: 'enroll' | 'assert'
}): Promise<void> {
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()

  await supabase
    .from('webauthn_challenges' as any)
    .update({ consumed_at: new Date().toISOString() } as any)
    .eq('employee_id', params.employeeId)
    .eq('purpose', params.purpose)
    .is('consumed_at', null)

  const { error } = await supabase.from('webauthn_challenges' as any).insert({
    employee_id: params.employeeId,
    company_id: params.companyId,
    challenge: params.challenge,
    purpose: params.purpose,
    expires_at: expiresAt,
  } as any)

  if (error) {
    logger.error('Failed to store webauthn challenge', error)
    throw new Error('No se pudo preparar el desafío biométrico')
  }
}

async function consumeChallenge(params: {
  employeeId: string
  purpose: 'enroll' | 'assert'
}): Promise<string | null> {
  const supabase = createAdminClient()

  // Prefer atomic RPC (Pareto harden migration)
  const { data: rpcChallenge, error: rpcError } = await supabase.rpc(
    'consume_webauthn_challenge' as any,
    {
      p_employee_id: params.employeeId,
      p_purpose: params.purpose,
    } as any
  )

  if (!rpcError && typeof rpcChallenge === 'string' && rpcChallenge.length > 0) {
    return rpcChallenge
  }

  // Fallback if RPC not yet migrated (non-atomic)
  if (rpcError) {
    logger.warn('consume_webauthn_challenge RPC unavailable; using fallback', {
      message: rpcError.message,
    })
  }

  const { data, error } = await supabase
    .from('webauthn_challenges' as any)
    .select('id, challenge, expires_at')
    .eq('employee_id', params.employeeId)
    .eq('purpose', params.purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const row = data as { id: string; challenge: string; expires_at: string }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase
      .from('webauthn_challenges' as any)
      .update({ consumed_at: new Date().toISOString() } as any)
      .eq('id', row.id)
    return null
  }

  const { data: consumed, error: consumeErr } = await supabase
    .from('webauthn_challenges' as any)
    .update({ consumed_at: new Date().toISOString() } as any)
    .eq('id', row.id)
    .is('consumed_at', null)
    .select('challenge')
    .maybeSingle()

  if (consumeErr || !consumed) return null
  return (consumed as { challenge: string }).challenge
}

export async function listActiveCredentials(
  employeeId: string
): Promise<DeviceCredentialRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('employee_device_credentials' as any)
    .select('id, employee_id, company_id, credential_id, public_key, counter, transports, revoked_at')
    .eq('employee_id', employeeId)
    .is('revoked_at', null)

  if (error) {
    logger.error('Failed to list device credentials', error)
    return []
  }
  return (data || []) as DeviceCredentialRow[]
}

export async function createEnrollOptions(params: {
  req: NextApiRequest
  employeeId: string
  companyId: string
  employeeName: string
  employeeDni: string
}) {
  const existing = await listActiveCredentials(params.employeeId)
  if (existing.length >= MAX_ACTIVE_CREDENTIALS) {
    return {
      ok: false as const,
      code: 'CREDENTIAL_LIMIT',
      message:
        'Ya hay un dispositivo vinculado. RR.HH. debe revocar el anterior antes de enrollar otro.',
    }
  }

  const rp = resolveWebAuthnRp(params.req)

  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userID: new Uint8Array(Buffer.from(params.employeeId, 'utf8')),
    userName: params.employeeDni,
    userDisplayName: params.employeeName,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      // Prefer device-bound; reject synced passkeys after verify
      residentKey: 'discouraged',
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credential_id,
      transports: (c.transports || undefined) as AuthenticatorTransport[] | undefined,
    })),
  })

  await storeChallenge({
    employeeId: params.employeeId,
    companyId: params.companyId,
    challenge: options.challenge,
    purpose: 'enroll',
  })

  return { ok: true as const, options, rp }
}

export async function verifyAndStoreEnrollment(params: {
  req: NextApiRequest
  employeeId: string
  companyId: string
  response: RegistrationResponseJSON
  deviceLabel?: string
}): Promise<{ ok: true; credentialId: string } | { ok: false; code: string; message: string }> {
  const existing = await listActiveCredentials(params.employeeId)
  if (existing.length >= MAX_ACTIVE_CREDENTIALS) {
    return {
      ok: false,
      code: 'CREDENTIAL_LIMIT',
      message:
        'Ya hay un dispositivo vinculado. RR.HH. debe revocar el anterior antes de enrollar otro.',
    }
  }

  let rp: WebAuthnRelyingParty
  try {
    rp = resolveWebAuthnRp(params.req)
  } catch (err: any) {
    return {
      ok: false,
      code: 'WEBAUTHN_RP_MISCONFIGURED',
      message: err?.message || 'WebAuthn mal configurado en el servidor',
    }
  }

  const expectedChallenge = await consumeChallenge({
    employeeId: params.employeeId,
    purpose: 'enroll',
  })

  if (!expectedChallenge) {
    return {
      ok: false,
      code: 'WEBAUTHN_CHALLENGE_EXPIRED',
      message: 'El desafío biométrico expiró. Intenta de nuevo.',
    }
  }

  let verification: VerifiedRegistrationResponse
  try {
    verification = await verifyRegistrationResponse({
      response: params.response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    })
  } catch (err) {
    logger.warn('WebAuthn enrollment verification failed', { err: String(err) })
    return {
      ok: false,
      code: 'WEBAUTHN_ENROLL_FAILED',
      message: 'No se pudo registrar la biometría del dispositivo.',
    }
  }

  if (!verification.verified || !verification.registrationInfo) {
    return {
      ok: false,
      code: 'WEBAUTHN_ENROLL_FAILED',
      message: 'Verificación biométrica rechazada.',
    }
  }

  const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
    verification.registrationInfo

  // Device-binding claim: reject iCloud/Google synced passkeys
  if (credentialBackedUp || credentialDeviceType === 'multiDevice') {
    return {
      ok: false,
      code: 'WEBAUTHN_SYNCED_PASSKEY',
      message:
        'Se requiere biometría de este teléfono (no passkey sincronizada en la nube). Usa Face ID / huella del dispositivo.',
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('employee_device_credentials' as any).insert({
    employee_id: params.employeeId,
    company_id: params.companyId,
    credential_id: credential.id,
    public_key: b64urlEncode(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports || null,
    device_label: params.deviceLabel || null,
    aaguid: aaguid || null,
    backed_up: false,
  } as any)

  if (error) {
    logger.error('Failed to persist device credential', error)
    return {
      ok: false,
      code: 'WEBAUTHN_STORE_FAILED',
      message: 'No se pudo guardar el vínculo del dispositivo.',
    }
  }

  return { ok: true, credentialId: credential.id }
}

export async function createAssertOptions(params: {
  req: NextApiRequest
  employeeId: string
  companyId: string
}) {
  let rp: WebAuthnRelyingParty
  try {
    rp = resolveWebAuthnRp(params.req)
  } catch (err: any) {
    return {
      ok: false as const,
      code: 'WEBAUTHN_RP_MISCONFIGURED',
      message: err?.message || 'WebAuthn mal configurado en el servidor',
    }
  }

  const existing = await listActiveCredentials(params.employeeId)

  if (existing.length === 0) {
    return {
      ok: false as const,
      code: 'WEBAUTHN_NOT_ENROLLED',
      message: 'Este dispositivo aún no está vinculado. Completa el registro biométrico primero.',
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: 'required',
    allowCredentials: existing.map((c) => ({
      id: c.credential_id,
      transports: (c.transports || undefined) as AuthenticatorTransport[] | undefined,
    })),
  })

  await storeChallenge({
    employeeId: params.employeeId,
    companyId: params.companyId,
    challenge: options.challenge,
    purpose: 'assert',
  })

  return { ok: true as const, options, rp }
}

export async function verifyAssertion(params: {
  req: NextApiRequest
  employeeId: string
  response: AuthenticationResponseJSON
}): Promise<
  | {
      ok: true
      credentialId: string
      credentialIdPrefix: string
    }
  | { ok: false; code: string; message: string }
> {
  let rp: WebAuthnRelyingParty
  try {
    rp = resolveWebAuthnRp(params.req)
  } catch (err: any) {
    return {
      ok: false,
      code: 'WEBAUTHN_RP_MISCONFIGURED',
      message: err?.message || 'WebAuthn mal configurado en el servidor',
    }
  }

  const expectedChallenge = await consumeChallenge({
    employeeId: params.employeeId,
    purpose: 'assert',
  })

  if (!expectedChallenge) {
    return {
      ok: false,
      code: 'WEBAUTHN_CHALLENGE_EXPIRED',
      message: 'El desafío biométrico expiró. Intenta de nuevo.',
    }
  }

  const credentials = await listActiveCredentials(params.employeeId)
  const matched = credentials.find((c) => c.credential_id === params.response.id)

  if (!matched) {
    return {
      ok: false,
      code: 'WEBAUTHN_UNKNOWN_CREDENTIAL',
      message: 'Credencial no reconocida. Vincula este dispositivo primero.',
    }
  }

  let verification: VerifiedAuthenticationResponse
  try {
    verification = await verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: matched.credential_id,
        publicKey: new Uint8Array(b64urlDecode(matched.public_key)),
        counter: Number(matched.counter) || 0,
        transports: (matched.transports || undefined) as AuthenticatorTransport[] | undefined,
      },
    })
  } catch (err) {
    logger.warn('WebAuthn assertion verification failed', { err: String(err) })
    return {
      ok: false,
      code: 'WEBAUTHN_REJECTED',
      message: 'Biometría rechazada o cancelada. Intenta de nuevo.',
    }
  }

  if (!verification.verified) {
    return {
      ok: false,
      code: 'WEBAUTHN_REJECTED',
      message: 'Biometría rechazada.',
    }
  }

  const newCounter = verification.authenticationInfo.newCounter
  const storedCounter = Number(matched.counter) || 0
  // Clone detection when authenticator supports counters
  if (storedCounter > 0 && newCounter <= storedCounter) {
    logger.warn('WebAuthn counter clone suspected', {
      employeeId: params.employeeId,
      storedCounter,
      newCounter,
    })
    return {
      ok: false,
      code: 'WEBAUTHN_CLONE_SUSPECTED',
      message: 'Credencial inválida. Contacte a RR.HH. para re-vincular el dispositivo.',
    }
  }

  const supabase = createAdminClient()
  await supabase
    .from('employee_device_credentials' as any)
    .update({
      counter: newCounter,
      last_used_at: new Date().toISOString(),
    } as any)
    .eq('id', matched.id)

  return {
    ok: true,
    credentialId: matched.credential_id,
    credentialIdPrefix: matched.credential_id.slice(0, 12),
  }
}

export function isPlatformAuthenticatorAvailableClientHint(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return (
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('android') ||
    ua.includes('mac os') ||
    ua.includes('windows')
  )
}
