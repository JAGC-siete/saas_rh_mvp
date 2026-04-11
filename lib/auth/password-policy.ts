/**
 * Política de contraseña para administración (alta y reset).
 * Usar en API y UI para mensajes coherentes.
 */

export const ADMIN_PASSWORD_MIN_LENGTH = 8

export const ADMIN_PASSWORD_POLICY_MESSAGE_ES =
  'La contraseña debe tener al menos 8 caracteres.'

export function validateAdminPassword(
  password: unknown
): { ok: true } | { ok: false; message: string } {
  if (typeof password !== 'string' || password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return { ok: false, message: ADMIN_PASSWORD_POLICY_MESSAGE_ES }
  }
  return { ok: true }
}

/** 0 = vacía, 1–4 = fuerza creciente (solo UI, heurística). */
export function computePasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0
  let score = 1
  if (password.length >= ADMIN_PASSWORD_MIN_LENGTH) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4
}

export function passwordStrengthLabel(score: 0 | 1 | 2 | 3 | 4): string {
  switch (score) {
    case 0:
      return ''
    case 1:
      return 'Muy débil'
    case 2:
      return 'Débil'
    case 3:
      return 'Aceptable'
    case 4:
      return 'Fuerte'
    default:
      return ''
  }
}

const SECURE_PW_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+'

/**
 * Genera contraseña aleatoria solo en cliente o entornos con crypto seguro.
 * No registrar ni enviar a logs.
 */
export function generateSecurePassword(length = 16): string {
  const n = Math.max(ADMIN_PASSWORD_MIN_LENGTH, Math.min(64, length))
  const bytes = new Uint32Array(n)
  const c = globalThis.crypto
  if (!c?.getRandomValues) {
    throw new Error('crypto.getRandomValues no está disponible')
  }
  c.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < n; i++) {
    out += SECURE_PW_ALPHABET[bytes[i]! % SECURE_PW_ALPHABET.length]
  }
  return out
}
