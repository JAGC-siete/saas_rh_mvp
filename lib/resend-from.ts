const NOREPLY_EMAIL = 'noreply@humanosisu.net'
const CONTACT_EMAIL = 'jorgearturo@humanosisu.net'

function extractEmail(from: string): string | null {
  const angle = from.match(/<([^>]+)>/)
  if (angle?.[1]) return angle[1].trim()
  const trimmed = from.trim()
  return trimmed.includes('@') ? trimmed : null
}

/** Remitente transaccional: nómina, OTP, notificaciones de producto. */
export function getResendFromNoreply(options?: { displayName?: string }): string {
  const configured = process.env.RESEND_FROM_NOREPLY?.trim()
  if (configured) return configured

  const name = options?.displayName ?? 'SISU Nómina'
  return `${name} <${NOREPLY_EMAIL}>`
}

/** Remitente comercial / contacto humano: ventas, activación, marketing. */
export function getResendFromContact(): string {
  const configured =
    process.env.RESEND_FROM_CONTACT?.trim() ||
    process.env.RESEND_FROM?.trim()
  if (configured) return configured
  return `SISU <${CONTACT_EMAIL}>`
}

/** Email bare para campos fromEmail en proveedores de notificación. */
export function getResendNoreplyEmail(): string {
  return extractEmail(getResendFromNoreply()) ?? NOREPLY_EMAIL
}

export function getResendContactEmail(): string {
  return extractEmail(getResendFromContact()) ?? CONTACT_EMAIL
}
