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
  return `${body.trim()}\n\n---\nSi no deseas recibir más correos, puedes darte de baja aquí:\n${url}`
}
