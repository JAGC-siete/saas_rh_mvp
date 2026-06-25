/**
 * Resend inbound webhook — Godfather PDF auto-send on keyword reply.
 *
 * Setup (production):
 * 1. Resend Dashboard → Receiving → configure domain
 * 2. Webhooks → Add → event `email.received` → this URL
 * 3. Set RESEND_WEBHOOK_SECRET (whsec_...) in env
 * 4. Ensure deduction PDF emails use Reply-To contact address
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../lib/logger'
import { maskEmail } from '../../../lib/privacy'
import {
  fetchReceivedEmailText,
  processGodfatherInboundReply,
} from '../../../lib/public-calculator/godfather-inbound'
import { verifySvixWebhookPayload } from '../../../lib/public-calculator/verify-svix-webhook'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = []
  return await new Promise((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

type ResendInboundEvent = {
  type?: string
  data?: {
    email_id?: string
    from?: string
    to?: string[]
    subject?: string
  }
}

async function verifyResendWebhook(payload: string, req: NextApiRequest): Promise<ResendInboundEvent> {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  const id = req.headers['svix-id'] as string | undefined
  const timestamp = req.headers['svix-timestamp'] as string | undefined
  const signature = req.headers['svix-signature'] as string | undefined

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_WEBHOOK_SECRET not configured')
    }
    logger.warn('Resend inbound: skipping verification (no secret, non-production)')
    return JSON.parse(payload) as ResendInboundEvent
  }

  if (!id || !timestamp || !signature) {
    throw new Error('Missing Svix headers')
  }

  verifySvixWebhookPayload(payload, { id, timestamp, signature }, secret)
  return JSON.parse(payload) as ResendInboundEvent
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawBody = await readRawBody(req)
    const event = await verifyResendWebhook(rawBody, req)

    if (event.type !== 'email.received') {
      return res.status(200).json({ ok: true, skipped: 'not_email_received' })
    }

    const emailId = event.data?.email_id
    const from = event.data?.from
    if (!emailId || !from) {
      logger.warn('Resend inbound: missing email_id or from', { type: event.type })
      return res.status(200).json({ ok: true, skipped: 'missing_fields' })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      logger.error('Resend inbound: RESEND_API_KEY missing')
      return res.status(500).json({ error: 'Email service not configured' })
    }

    const bodyText = await fetchReceivedEmailText(emailId, apiKey)
    const outcome = await processGodfatherInboundReply({ from, bodyText })

    if (outcome.keywordMatched && outcome.sent) {
      logger.info('Godfather inbound: pack sent', { email: maskEmail(outcome.email || from) })
      return res.status(200).json({ ok: true, sent: true })
    }

    return res.status(200).json({
      ok: true,
      sent: false,
      keywordMatched: outcome.keywordMatched,
      reason: 'reason' in outcome ? outcome.reason : undefined,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Resend inbound webhook error', { error: message })
    return res.status(400).json({ error: 'Invalid webhook' })
  }
}
