import { randomBytes } from 'crypto'

export function generateUnsubscribeToken(): string {
  return randomBytes(24).toString('hex')
}

export function getMarketingSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
}

export function buildUnsubscribeUrl(token: string): string {
  return `${getMarketingSiteUrl()}/api/mail-list/unsubscribe?token=${encodeURIComponent(token)}`
}

export function appendUnsubscribeFooter(body: string, unsubscribeToken: string): string {
  const url = buildUnsubscribeUrl(unsubscribeToken)
  return `${body.trim()}\n\n---\nLa serie contiene únicamente 4 correos, pero podes dejar de recibirlos aquí:\n${url}`
}
