import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import {
  isRateLimitError,
  renderOutreachBody,
  sleep,
  type B2bProspectContact,
} from './prospection'

export type SendProspectionEmailInput = {
  to: string
  subject: string
  bodyTemplate: string
  ciudad: string
  dryRun?: boolean
}

export type SendProspectionEmailResult = {
  status: 'dry_run' | 'sent' | 'error' | 'skipped'
  resendId: string | null
  error: string | null
  renderedBody: string
  subject: string
  to: string
}

function extractResendError(result: unknown): string | null {
  const err = (result as { error?: { message?: string; statusCode?: number } })?.error
  if (!err) return null
  const code = err.statusCode != null ? ` (${err.statusCode})` : ''
  return `${err.message || 'Resend send failed'}${code}`
}

function extractResendId(result: unknown): string | null {
  return (
    (result as { data?: { id?: string }; id?: string })?.data?.id ??
    (result as { id?: string })?.id ??
    null
  )
}

async function sendOnce(params: {
  apiKey: string
  to: string
  subject: string
  text: string
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const resend = new Resend(params.apiKey)
  const result = await resend.emails.send({
    from: getResendFromContact(),
    to: params.to,
    subject: params.subject,
    text: params.text,
  })

  const err = extractResendError(result)
  if (err) return { ok: false, error: err }
  return { ok: true, id: extractResendId(result) }
}

export async function sendProspectionOutreachEmail(
  input: SendProspectionEmailInput
): Promise<SendProspectionEmailResult> {
  const subject = input.subject.trim()
  const renderedBody = renderOutreachBody(input.bodyTemplate, input.ciudad)
  const to = input.to.trim().toLowerCase()

  if (input.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return {
      status: 'dry_run',
      resendId: null,
      error: null,
      renderedBody,
      subject,
      to,
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      status: 'error',
      resendId: null,
      error: 'RESEND_API_KEY not configured',
      renderedBody,
      subject,
      to,
    }
  }

  try {
    let attempt = await sendOnce({ apiKey, to, subject, text: renderedBody })

    // One retry on rate limit (skill requirement).
    if (!attempt.ok && isRateLimitError(attempt.error)) {
      await sleep(1500)
      attempt = await sendOnce({ apiKey, to, subject, text: renderedBody })
    }

    if (!attempt.ok) {
      return {
        status: 'error',
        resendId: null,
        error: attempt.error,
        renderedBody,
        subject,
        to,
      }
    }

    return {
      status: 'sent',
      resendId: attempt.id,
      error: null,
      renderedBody,
      subject,
      to,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (isRateLimitError(message)) {
      try {
        await sleep(1500)
        const retry = await sendOnce({
          apiKey,
          to,
          subject,
          text: renderedBody,
        })
        if (retry.ok) {
          return {
            status: 'sent',
            resendId: retry.id,
            error: null,
            renderedBody,
            subject,
            to,
          }
        }
        return {
          status: 'error',
          resendId: null,
          error: retry.error,
          renderedBody,
          subject,
          to,
        }
      } catch (retryErr) {
        return {
          status: 'error',
          resendId: null,
          error: retryErr instanceof Error ? retryErr.message : String(retryErr),
          renderedBody,
          subject,
          to,
        }
      }
    }

    return {
      status: 'error',
      resendId: null,
      error: message,
      renderedBody,
      subject,
      to,
    }
  }
}

export async function sendProspectionBatch(params: {
  contacts: B2bProspectContact[]
  subject: string
  bodyTemplate: string
  ciudad: string
  dryRun: boolean
  delayMs?: number
}): Promise<SendProspectionEmailResult[]> {
  const results: SendProspectionEmailResult[] = []
  const delayMs = params.delayMs ?? 800

  for (let i = 0; i < params.contacts.length; i += 1) {
    const contact = params.contacts[i]
    const email = contact.email_normalized || contact.email
    if (!email) {
      results.push({
        status: 'skipped',
        resendId: null,
        error: 'Contact has no email',
        renderedBody: renderOutreachBody(params.bodyTemplate, params.ciudad),
        subject: params.subject,
        to: '',
      })
      continue
    }

    const result = await sendProspectionOutreachEmail({
      to: email,
      subject: params.subject,
      bodyTemplate: params.bodyTemplate,
      ciudad: params.ciudad,
      dryRun: params.dryRun,
    })
    results.push(result)

    if (!params.dryRun && i < params.contacts.length - 1) {
      await sleep(delayMs)
    }
  }

  return results
}
