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

export const MARKETING_UNSUBSCRIBE_FOOTER_TEXT =
  'La serie contiene únicamente 5 correos, pero podes dejar de recibirlos aquí:'

export function appendUnsubscribeFooter(body: string, unsubscribeToken: string): string {
  const url = buildUnsubscribeUrl(unsubscribeToken)
  return `${body.trim()}\n\n---\n${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}\n${url}`
}
