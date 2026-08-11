import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../../lib/security/api-responses'
import { logger } from '../../../../../../lib/logger'
import { sendProspectionOutreachEmail } from '../../../../../../lib/admin/prospection-email'
import {
  MAX_PROSPECTION_SEND_BATCH,
  contactAlreadySent,
  isStuckSending,
  sleep,
  type B2bProspectContact,
} from '../../../../../../lib/admin/prospection'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  const runId = String(req.query.id || '')
  if (!runId) {
    return res.status(400).json(createErrorResponse('id is required', 'VALIDATION_ERROR'))
  }

  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)
    if (!user?.id) {
      return res.status(500).json(
        createErrorResponse('Authentication error', 'AUTH_ERROR', {
          details: 'User information not available',
        })
      )
    }

    const dryRun = Boolean(req.body?.dryRun ?? true)
    const forceResend = Boolean(req.body?.forceResend)
    const contactIds: string[] = Array.isArray(req.body?.contactIds)
      ? req.body.contactIds.map((id: unknown) => String(id))
      : []

    if (contactIds.length === 0) {
      return res
        .status(400)
        .json(createErrorResponse('contactIds is required', 'VALIDATION_ERROR'))
    }

    if (contactIds.length > MAX_PROSPECTION_SEND_BATCH) {
      return res.status(400).json(
        createErrorResponse(
          `Máximo ${MAX_PROSPECTION_SEND_BATCH} contactos por request (evita timeout serverless).`,
          'VALIDATION_ERROR',
          { max: MAX_PROSPECTION_SEND_BATCH, requested: contactIds.length }
        )
      )
    }

    const { data: run, error: runError } = await adminClient
      .from('b2b_prospect_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle()

    if (runError) {
      return res.status(500).json(createErrorResponse(runError.message, 'DB_ERROR'))
    }
    if (!run) {
      return res.status(404).json(createErrorResponse('Run not found', 'NOT_FOUND'))
    }

    // Recover stuck "sending" before starting another live blast.
    if (isStuckSending(run)) {
      await adminClient.from('b2b_prospect_runs').update({ status: 'ready' }).eq('id', runId)
      run.status = 'ready'
    } else if (!dryRun && run.status === 'sending') {
      return res.status(409).json(
        createErrorResponse(
          'Corrida en estado sending. Espera o reintenta en unos minutos (auto-recovery a los 5 min).',
          'CONFLICT'
        )
      )
    }

    const subject = String(req.body?.email_subject || run.email_subject).trim()
    const bodyTemplate = String(req.body?.email_body || run.email_body)
    const persistTemplate = Boolean(req.body?.persistTemplate)

    if (!subject || !bodyTemplate.trim()) {
      return res
        .status(400)
        .json(createErrorResponse('email subject/body required', 'VALIDATION_ERROR'))
    }

    if (persistTemplate) {
      await adminClient
        .from('b2b_prospect_runs')
        .update({ email_subject: subject, email_body: bodyTemplate })
        .eq('id', runId)
    }

    const { data: contacts, error: contactsError } = await adminClient
      .from('b2b_prospect_contacts')
      .select('*')
      .eq('run_id', runId)
      .in('id', contactIds)

    if (contactsError) {
      return res.status(500).json(createErrorResponse(contactsError.message, 'DB_ERROR'))
    }

    const list = (contacts || []) as B2bProspectContact[]
    if (list.length === 0) {
      return res.status(400).json(createErrorResponse('No matching contacts', 'VALIDATION_ERROR'))
    }

    const { data: priorSent, error: priorError } = await adminClient
      .from('b2b_prospect_email_ledger')
      .select('contact_id, status')
      .eq('run_id', runId)
      .eq('status', 'sent')
      .in(
        'contact_id',
        list.map((c) => c.id)
      )

    if (priorError) {
      return res.status(500).json(createErrorResponse(priorError.message, 'DB_ERROR'))
    }

    const priorSentRows = (priorSent || []) as Array<{ contact_id: string; status: string }>

    if (!dryRun) {
      await adminClient.from('b2b_prospect_runs').update({ status: 'sending' }).eq('id', runId)
    }

    const results: Array<{
      contactId: string
      comercio: string
      to: string
      status: string
      resendId: string | null
      error: string | null
    }> = []

    try {
      for (let i = 0; i < list.length; i += 1) {
        const contact = list[i]
        const to = contact.email_normalized || contact.email

        if (!dryRun && !forceResend && contactAlreadySent(priorSentRows, contact.id)) {
          results.push({
            contactId: contact.id,
            comercio: contact.comercio,
            to: to || '',
            status: 'skipped',
            resendId: null,
            error: 'Already sent (idempotent skip). Pass forceResend=true to override.',
          })
          await adminClient.from('b2b_prospect_email_ledger').insert({
            run_id: runId,
            contact_id: contact.id,
            subject,
            body: bodyTemplate,
            to_email: to || '',
            status: 'skipped',
            resend_id: null,
            error: 'Already sent',
          })
          continue
        }

        if (!to) {
          await adminClient.from('b2b_prospect_email_ledger').insert({
            run_id: runId,
            contact_id: contact.id,
            subject,
            body: bodyTemplate,
            to_email: '',
            status: 'skipped',
            resend_id: null,
            error: 'No email',
          })
          results.push({
            contactId: contact.id,
            comercio: contact.comercio,
            to: '',
            status: 'skipped',
            resendId: null,
            error: 'No email',
          })
          continue
        }

        const sendResult = await sendProspectionOutreachEmail({
          to,
          subject,
          bodyTemplate,
          ciudad: run.ciudad,
          dryRun,
        })

        const ledgerStatus =
          sendResult.status === 'dry_run'
            ? 'dry_run'
            : sendResult.status === 'skipped'
              ? 'skipped'
              : sendResult.status

        const { error: ledgerInsertError } = await adminClient
          .from('b2b_prospect_email_ledger')
          .insert({
            run_id: runId,
            contact_id: contact.id,
            subject: sendResult.subject,
            body: sendResult.renderedBody,
            to_email: sendResult.to,
            status: ledgerStatus,
            resend_id: sendResult.resendId,
            error: sendResult.error,
          })

        // Unique sent-per-contact: treat conflict as skipped already-sent.
        if (ledgerInsertError && sendResult.status === 'sent') {
          results.push({
            contactId: contact.id,
            comercio: contact.comercio,
            to: sendResult.to,
            status: 'skipped',
            resendId: sendResult.resendId,
            error: 'Already sent (DB unique). Email may have been delivered.',
          })
        } else {
          results.push({
            contactId: contact.id,
            comercio: contact.comercio,
            to: sendResult.to,
            status: sendResult.status,
            resendId: sendResult.resendId,
            error: sendResult.error || (ledgerInsertError ? ledgerInsertError.message : null),
          })
        }

        if (!dryRun && i < list.length - 1) {
          await sleep(800)
        }
      }
    } finally {
      if (!dryRun) {
        const sentCount = results.filter((r) => r.status === 'sent').length
        const errorCount = results.filter((r) => r.status === 'error').length
        await adminClient
          .from('b2b_prospect_runs')
          .update({ status: errorCount > 0 && sentCount === 0 ? 'ready' : 'sent' })
          .eq('id', runId)
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length
    const errorCount = results.filter((r) => r.status === 'error').length
    const skippedCount = results.filter((r) => r.status === 'skipped').length

    await auditLog('b2b_prospection_send', {
      runId,
      dryRun,
      forceResend,
      requested: contactIds.length,
      sent: sentCount,
      errors: errorCount,
      skipped: skippedCount,
    })

    // Explicitly do NOT enroll into marketing_leads.

    return res.status(200).json(
      createSuccessResponse({
        dryRun,
        results,
        summary: {
          requested: contactIds.length,
          sent: sentCount,
          dryRun: results.filter((r) => r.status === 'dry_run').length,
          errors: errorCount,
          skipped: skippedCount,
          maxBatch: MAX_PROSPECTION_SEND_BATCH,
        },
      })
    )
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    logger.error('prospection send handler error', { error: message, runId })
    try {
      const { createAdminClient } = await import('../../../../../../lib/supabase/server')
      const admin = createAdminClient()
      await admin.from('b2b_prospect_runs').update({ status: 'ready' }).eq('id', runId)
    } catch {
      // ignore unstick failure
    }
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
