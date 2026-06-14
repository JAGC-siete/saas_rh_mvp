import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  assertCommPayloadSize,
  createCampaignSchema,
  type CampaignRow,
} from '../../../../lib/communications/schema'
import { resolveAudience, sendMassCommunication } from '../../../../lib/communication-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Auth: super_admin only, with audit logging (real cookie session).
    const auth = await requireSuperAdminWithAudit(req, res)

    assertCommPayloadSize(req.body)
    const input = createCampaignSchema.parse(req.body)

    const admin = createAdminClient()

    // 1. Resolve audience first; bail early if empty.
    const recipients = await resolveAudience(input.segment)
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No hay destinatarios para el segmento seleccionado' })
    }

    // 2. Create the campaign record.
    const { data: campaign, error: campaignError } = await admin
      .from('communication_campaigns')
      .insert({
        subject: input.subject,
        body: input.body,
        target_segment: input.segment,
        status: 'sending',
        created_by: auth.user.id,
      })
      .select('*')
      .single()

    if (campaignError || !campaign) {
      throw new Error('Failed to create campaign')
    }

    await auth.auditLog('communication_campaign_created', {
      campaignId: (campaign as CampaignRow).id,
      segment: input.segment,
      recipientCount: recipients.length,
    })

    // 3. Fire-and-forget the batch send to avoid serverless timeouts. Status is
    //    updated to 'sent'/'failed' inside sendMassCommunication.
    void sendMassCommunication((campaign as CampaignRow).id, recipients).catch((err) => {
      console.error('Mass communication failure:', err)
      admin
        .from('communication_campaigns')
        .update({ status: 'failed' })
        .eq('id', (campaign as CampaignRow).id)
        .then(() => undefined)
    })

    return res.status(200).json({
      message: 'Campaign triggered successfully',
      campaignId: (campaign as CampaignRow).id,
      recipientCount: recipients.length,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.issues.map((i) => i.message),
      })
    }
    if (error instanceof Error) {
      if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'ACCOUNT_DEACTIVATED'].includes(error.message)) {
        return
      }
      if (error.message === 'PAYLOAD_TOO_LARGE') {
        return res.status(413).json({ error: 'Payload demasiado grande' })
      }
    }
    console.error('[api/super-admin/communications/send] error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
}
