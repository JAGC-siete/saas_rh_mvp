import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import { improveMtpFunction } from '../../../lib/ai/mtp-improver'
import { mtpItemSchema } from '../../../lib/mtp/schema'

const improveSchema = z.object({
  role_name: z.string().trim().max(160).optional(),
  item: mtpItemSchema
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireCompanyAccess(req, res)
    const input = improveSchema.parse(req.body)
    const result = await improveMtpFunction(input.item, input.role_name)

    if (!result.success) {
      return res.status(result.reason === 'no_key' ? 200 : 502).json(result)
    }

    return res.status(200).json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.issues.map((issue) => issue.message)
      })
    }

    if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error?.message)) {
      return
    }

    console.error('MTP improve API error:', error)
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    })
  }
}

export default withGeneralRateLimit(['POST'])(handler)
