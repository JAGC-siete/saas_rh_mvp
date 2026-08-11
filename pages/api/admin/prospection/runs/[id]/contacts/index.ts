import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../../../lib/security/api-responses'
import { logger } from '../../../../../../../lib/logger'
import {
  normalizeImportContact,
  type ImportContactInput,
} from '../../../../../../../lib/admin/prospection'

type NormalizedContact = NonNullable<ReturnType<typeof normalizeImportContact>>
type ContactRow = NormalizedContact & { run_id: string }

async function upsertContact(
  adminClient: any,
  row: ContactRow
): Promise<{ contact: unknown | null; error: string | null }> {
  if (row.email_normalized) {
    const { data: existing } = await adminClient
      .from('b2b_prospect_contacts')
      .select('id')
      .eq('run_id', row.run_id)
      .eq('email_normalized', row.email_normalized)
      .maybeSingle()

    if (existing?.id) {
      const { data, error } = await adminClient
        .from('b2b_prospect_contacts')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle()
      return { contact: data, error: error?.message || null }
    }
  } else {
    const { data: existing } = await adminClient
      .from('b2b_prospect_contacts')
      .select('id')
      .eq('run_id', row.run_id)
      .is('email_normalized', null)
      .ilike('comercio', row.comercio)
      .maybeSingle()

    if (existing?.id) {
      const { data, error } = await adminClient
        .from('b2b_prospect_contacts')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle()
      return { contact: data, error: error?.message || null }
    }
  }

  const { data, error } = await adminClient
    .from('b2b_prospect_contacts')
    .insert(row)
    .select('*')
    .maybeSingle()

  return { contact: data, error: error?.message || null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const { data: run, error: runError } = await adminClient
      .from('b2b_prospect_runs')
      .select('id')
      .eq('id', runId)
      .maybeSingle()

    if (runError) {
      return res.status(500).json(createErrorResponse(runError.message, 'DB_ERROR'))
    }
    if (!run) {
      return res.status(404).json(createErrorResponse('Run not found', 'NOT_FOUND'))
    }

    if (req.method === 'GET') {
      const { data, error } = await adminClient
        .from('b2b_prospect_contacts')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: true })

      if (error) {
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }

      return res.status(200).json(createSuccessResponse({ contacts: data || [] }))
    }

    if (req.method === 'POST') {
      const rawItems: ImportContactInput[] = Array.isArray(req.body?.contacts)
        ? req.body.contacts
        : [req.body]

      const rows = rawItems
        .map((item) => normalizeImportContact(item || {}))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .map((row) => ({ ...row, run_id: runId }))

      if (rows.length === 0) {
        return res
          .status(400)
          .json(createErrorResponse('No valid contacts (comercio required)', 'VALIDATION_ERROR'))
      }

      const inserted: unknown[] = []
      const errors: string[] = []

      for (const row of rows) {
        const result = await upsertContact(adminClient, row)
        if (result.error || !result.contact) {
          errors.push(result.error || `Failed: ${row.comercio}`)
        } else {
          inserted.push(result.contact)
        }
      }

      if (inserted.length === 0) {
        return res.status(500).json(
          createErrorResponse(errors[0] || 'Failed to import contacts', 'DB_ERROR', {
            details: errors,
          })
        )
      }

      await auditLog('b2b_prospection_contacts_import', {
        runId,
        imported: inserted.length,
        errors: errors.length,
      })

      await adminClient
        .from('b2b_prospect_runs')
        .update({ status: 'ready' })
        .eq('id', runId)
        .in('status', ['draft', 'ready', 'sent'])

      return res.status(201).json(
        createSuccessResponse({
          contacts: inserted,
          imported: inserted.length,
          errors,
        })
      )
    }

    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    logger.error('prospection contacts handler error', { error: message, runId })
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
