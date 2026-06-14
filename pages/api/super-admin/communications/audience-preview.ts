import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { previewAudience } from '../../../../lib/communication-service'
import { commSegmentSchema } from '../../../../lib/communications/schema'

const querySchema = z.object({
  segment: commSegmentSchema.default('active_admins'),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireSuperAdminWithAudit(req, res)

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { segment } = querySchema.parse(req.query)
    const preview = await previewAudience(segment)
    return res.status(200).json({ preview })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Segmento inválido', details: error.issues.map((i) => i.message) })
    }
    if (error instanceof Error) {
      if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'ACCOUNT_DEACTIVATED'].includes(error.message)) {
        return
      }
    }
    console.error('[api/super-admin/communications/audience-preview] error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
}
