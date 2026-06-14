import type { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../lib/auth/api-guards'
import { fetchRecentCommits, GithubConfigError } from '../../../lib/communications/github'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireSuperAdminWithAudit(req, res)

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 30
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30

    const commits = await fetchRecentCommits(limit)
    return res.status(200).json({ commits })
  } catch (error: unknown) {
    if (error instanceof GithubConfigError) {
      return res.status(503).json({ error: 'GitHub no está configurado (define GITHUB_TOKEN)', code: 'GITHUB_NOT_CONFIGURED' })
    }
    if (error instanceof Error) {
      if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'ACCOUNT_DEACTIVATED'].includes(error.message)) {
        return
      }
    }
    console.error('[api/super-admin/commits] error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
}
