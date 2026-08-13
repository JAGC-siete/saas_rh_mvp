import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../../lib/security/api-responses'
import {
  buildWhatsAppLink,
  buildWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATE,
  normalizeHnPhone,
} from '../../../../../../lib/admin/prospection-whatsapp'

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
      return res.status(500).json(createErrorResponse('Authentication error', 'AUTH_ERROR'))
    }

    const contactIds: string[] = Array.isArray(req.body?.contactIds)
      ? req.body.contactIds.map((id: unknown) => String(id))
      : []
    if (!contactIds.length) {
      return res.status(400).json(createErrorResponse('contactIds is required', 'VALIDATION_ERROR'))
    }

    const { data: run, error: runError } = await adminClient
      .from('b2b_prospect_runs')
      .select('ciudad')
      .eq('id', runId)
      .maybeSingle()
    if (runError) return res.status(500).json(createErrorResponse(runError.message, 'DB_ERROR'))
    if (!run) return res.status(404).json(createErrorResponse('Run not found', 'NOT_FOUND'))

    const template = String(req.body?.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE)

    const { data: contacts, error } = await adminClient
      .from('b2b_prospect_contacts')
      .select('*')
      .eq('run_id', runId)
      .in('id', contactIds)

    if (error) return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))

    const results = []
    for (const c of contacts || []) {
      const phone = normalizeHnPhone(c.telefono)
      if (!phone) {
        results.push({
          contactId: c.id,
          comercio: c.comercio,
          status: 'sin_whatsapp',
          link: null,
          message: null,
          error: 'Teléfono inválido o ausente',
        })
        continue
      }

      const message = buildWhatsAppMessage({
        ciudad: run.ciudad,
        comercio: c.comercio,
        template,
      })
      const link = buildWhatsAppLink(phone, message)
      if (!link) {
        results.push({
          contactId: c.id,
          comercio: c.comercio,
          status: 'sin_whatsapp',
          link: null,
          message,
          error: 'No se pudo generar wa.me',
        })
        continue
      }

      await adminClient
        .from('b2b_prospect_contacts')
        .update({
          whatsapp_link: link,
          whatsapp_message: message,
          whatsapp_generated_at: new Date().toISOString(),
          telefono: phone,
        })
        .eq('id', c.id)

      results.push({
        contactId: c.id,
        comercio: c.comercio,
        status: 'ok',
        link,
        message,
        error: null,
      })
    }

    await auditLog('b2b_prospection_whatsapp_generate', {
      runId,
      requested: contactIds.length,
      ok: results.filter((r) => r.status === 'ok').length,
    })

    return res.status(200).json(
      createSuccessResponse({
        results,
        summary: {
          requested: contactIds.length,
          ok: results.filter((r) => r.status === 'ok').length,
          sinWhatsapp: results.filter((r) => r.status === 'sin_whatsapp').length,
        },
      })
    )
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
