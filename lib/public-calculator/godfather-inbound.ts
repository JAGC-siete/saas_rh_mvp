import { matchesGodfatherKeyword } from './godfather-keyword'
import { PUBLIC_CALCULATOR_CONFIGS } from './config'
import { sendGodfatherPackToLead, type SendGodfatherPackResult } from './send-godfather-pack'
import { logger } from '../logger'
import { maskEmail } from '../privacy'

function extractEmailAddress(from: string): string | null {
  const angle = from.match(/<([^>]+)>/)
  if (angle?.[1]) return angle[1].trim().toLowerCase()
  const trimmed = from.trim().toLowerCase()
  return trimmed.includes('@') ? trimmed : null
}

export async function fetchReceivedEmailText(emailId: string, apiKey: string): Promise<string> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Resend receiving API ${res.status}: ${errText.slice(0, 200)}`)
  }

  const payload = (await res.json()) as {
    text?: string
    html?: string
    body?: string
  }

  return payload.text || payload.body || stripHtml(payload.html || '')
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function processGodfatherInboundReply(params: {
  from: string
  bodyText: string
}): Promise<SendGodfatherPackResult & { email?: string; keywordMatched: boolean }> {
  const email = extractEmailAddress(params.from)
  const keyword =
    PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel?.godfatherKeyword ?? 'MI CONSTANCIA TARDA UNA ETERNIDAD'

  if (!email) {
    logger.warn('Godfather inbound: could not parse from address', { from: params.from })
    return { sent: false, reason: 'not_found', keywordMatched: false }
  }

  const keywordMatched = matchesGodfatherKeyword(params.bodyText, keyword)
  if (!keywordMatched) {
    logger.info('Godfather inbound: keyword not matched', { email: maskEmail(email) })
    return { sent: false, reason: 'not_pending', keywordMatched: false, email }
  }

  const result = await sendGodfatherPackToLead(email)
  return { ...result, email, keywordMatched: true }
}
