import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  assertCommPayloadSize,
  updateCampaignSchema,
  type CampaignRow,
} from '../../../../lib/communications/schema'
import { renderCampaignEmail, resolveAudience, sendMassCommunication } from '../../../../lib/communication-service'

// Only draft / scheduled campaigns can be edited or transitioned by the admin.
const EDITABLE_STATUSES = ['draft', 'scheduled']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireSuperAdminWithAudit(req, res)
    const admin = createAdminClient()

    const id = typeof req.query.id === 'string' ? req.query.id : null
    if (!id) return res.status(400).json({ error: 'ID requerido' })

    const { data: existing, error: fetchError } = await admin
      .from('communication_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) return res.status(404).json({ error: 'Campaña no encontrada' })
    const current = existing as CampaignRow

    if (req.method === 'DELETE') {
      if (!EDITABLE_STATUSES.includes(current.status)) {
        return res.status(409).json({ error: 'Solo se pueden eliminar borradores o programados' })
      }
      const { error } = await admin.from('communication_campaigns').delete().eq('id', id)
      if (error) throw error
      await auth.auditLog('communication_campaign_deleted', { campaignId: id })
      return res.status(200).json({ success: true })
    }

    if (req.method === 'PATCH') {
      if (!EDITABLE_STATUSES.includes(current.status)) {
        return res.status(409).json({ error: 'Solo se pueden editar borradores o programados' })
      }

      assertCommPayloadSize(req.body)
      const input = updateCampaignSchema.parse(req.body)

      const subject = input.subject ?? current.subject
      const intro = input.intro !== undefined ? input.intro : current.intro
      const blocks = input.blocks ?? current.blocks
      const ctaUrl = input.cta_url !== undefined ? input.cta_url : current.cta_url
      const ctaLabel = input.cta_label !== undefined ? input.cta_label : current.cta_label
      const segment = input.segment ?? current.target_segment ?? 'active_admins'

      if (input.action === 'schedule' && (!input.scheduled_at || Number.isNaN(Date.parse(input.scheduled_at)))) {
        return res.status(400).json({ error: 'scheduled_at válido es requerido para programar' })
      }
      if (input.action !== 'draft' && (!blocks || blocks.length === 0)) {
        return res.status(400).json({ error: 'Agrega al menos un bloque de contenido' })
      }

      const { html } = renderCampaignEmail({
        subject,
        intro: intro ?? null,
        blocks: blocks ?? [],
        cta_url: ctaUrl ?? null,
        cta_label: ctaLabel ?? null,
      })

      const status = input.action === 'draft' ? 'draft' : input.action === 'schedule' ? 'scheduled' : 'sending'

      const { data: updated, error: updateError } = await admin
        .from('communication_campaigns')
        .update({
          subject,
          body: html,
          intro: intro ?? null,
          blocks: blocks ?? [],
          cta_url: ctaUrl ?? null,
          cta_label: ctaLabel ?? null,
          target_segment: segment,
          status,
          scheduled_at: input.action === 'schedule' ? input.scheduled_at : null,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (updateError || !updated) throw new Error('Failed to update campaign')
      const row = updated as CampaignRow

      await auth.auditLog('communication_campaign_updated', { campaignId: id, action: input.action })

      if (input.action === 'send') {
        const recipients = await resolveAudience(segment)
        if (recipients.length === 0) {
          await admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', id)
          return res.status(400).json({ error: 'No hay destinatarios para el segmento seleccionado' })
        }
        void sendMassCommunication(id, recipients).catch((err) => {
          console.error('Mass communication failure:', err)
          admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', id).then(() => undefined)
        })
        return res.status(200).json({ campaign: row, recipientCount: recipients.length })
      }

      return res.status(200).json({ campaign: row })
    }

    res.setHeader('Allow', ['PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.issues.map((i) => i.message) })
    }
    if (error instanceof Error) {
      if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'ACCOUNT_DEACTIVATED'].includes(error.message)) {
        return
      }
      if (error.message === 'PAYLOAD_TOO_LARGE') {
        return res.status(413).json({ error: 'Payload demasiado grande' })
      }
    }
    console.error('[api/super-admin/communications/[id]] error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
}
