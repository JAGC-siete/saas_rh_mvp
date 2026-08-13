import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  assertCommPayloadSize,
  commStatusSchema,
  createCampaignSchema,
  type CampaignRow,
} from '../../../../lib/communications/schema'
import { renderCampaignEmail, resolveAudience, sendMassCommunication, AudienceResolutionError } from '../../../../lib/communication-service'

const listQuerySchema = z.object({
  status: commStatusSchema.optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireSuperAdminWithAudit(req, res)
    const admin = createAdminClient()

    if (req.method === 'GET') {
      const q = listQuerySchema.parse(req.query)
      let query = admin
        .from('communication_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (q.status) query = query.eq('status', q.status)

      const { data, error } = await query
      if (error) throw error
      return res.status(200).json({ campaigns: (data ?? []) as CampaignRow[] })
    }

    if (req.method === 'POST') {
      assertCommPayloadSize(req.body)
      const input = createCampaignSchema.parse(req.body)

      const { html } = renderCampaignEmail({
        subject: input.subject,
        intro: input.intro ?? null,
        blocks: input.blocks,
        cta_url: input.cta_url ?? null,
        cta_label: input.cta_label ?? null,
      })

      const status =
        input.action === 'draft' ? 'draft' : input.action === 'schedule' ? 'scheduled' : 'sending'

      const { data: campaign, error: insertError } = await admin
        .from('communication_campaigns')
        .insert({
          subject: input.subject,
          body: html,
          intro: input.intro ?? null,
          blocks: input.blocks,
          cta_url: input.cta_url ?? null,
          cta_label: input.cta_label ?? null,
          target_segment: input.segment,
          status,
          scheduled_at: input.action === 'schedule' ? input.scheduled_at : null,
          source_commits: input.source_commits ?? null,
          created_by: auth.user.id,
        })
        .select('*')
        .single()

      if (insertError || !campaign) throw new Error('Failed to create campaign')
      const row = campaign as CampaignRow

      await auth.auditLog('communication_campaign_created', {
        campaignId: row.id,
        action: input.action,
        segment: input.segment,
      })

      if (input.action === 'send') {
        try {
          const recipients = await resolveAudience(input.segment)
          if (recipients.length === 0) {
            await admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', row.id)
            return res.status(400).json({ error: 'No hay destinatarios para el segmento seleccionado' })
          }
          void sendMassCommunication(row.id, recipients).catch((err) => {
            console.error('Mass communication failure:', err)
            admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', row.id).then(() => undefined)
          })
          return res.status(200).json({ campaign: row, recipientCount: recipients.length })
        } catch (audienceErr) {
          await admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', row.id)
          if (audienceErr instanceof AudienceResolutionError) {
            return res.status(502).json({
              error: audienceErr.message,
              code: audienceErr.code,
              stats: {
                profilesMatched: audienceErr.stats.profilesMatched,
                authUsersLoaded: audienceErr.stats.authUsersLoaded,
                skippedNoEmail: audienceErr.stats.skippedNoEmail,
              },
            })
          }
          throw audienceErr
        }
      }

      return res.status(201).json({ campaign: row })
    }

    res.setHeader('Allow', ['GET', 'POST'])
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
    console.error('[api/super-admin/communications] error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
}
