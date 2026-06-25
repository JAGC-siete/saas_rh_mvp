import crypto from 'crypto'

type SvixHeaders = {
  id: string
  timestamp: string
  signature: string
}

const TOLERANCE_SECONDS = 300

function decodeSvixSecret(secret: string): Buffer {
  const raw = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  return Buffer.from(raw, 'base64')
}

/**
 * Verifies Resend inbound webhooks (Svix-signed).
 * @throws Error when verification fails
 */
export function verifySvixWebhookPayload(payload: string, headers: SvixHeaders, secret: string): void {
  const ts = Number(headers.timestamp)
  if (!Number.isFinite(ts)) {
    throw new Error('Invalid svix-timestamp')
  }

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) {
    throw new Error('Webhook timestamp outside tolerance')
  }

  const secretBytes = decodeSvixSecret(secret)
  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  const parts = headers.signature.split(' ')
  const valid = parts.some((part) => {
    const [, value] = part.split(',', 2)
    if (!value) return false
    try {
      const a = Buffer.from(value)
      const b = Buffer.from(expected)
      if (a.length !== b.length) return false
      return crypto.timingSafeEqual(a, b)
    } catch {
      return false
    }
  })

  if (!valid) {
    throw new Error('Invalid webhook signature')
  }
}
