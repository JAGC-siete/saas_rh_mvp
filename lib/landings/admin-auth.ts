/**
 * Auth del dashboard de landings: solo super_admin, sin exigir empresa activa.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit, type SuperAdminContext } from '../auth/api-guards'

const LANDING_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function requireLandingAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SuperAdminContext | null> {
  try {
    return await requireSuperAdminWithAudit(req, res)
  } catch {
    return null
  }
}

export function parseLandingIdParam(req: NextApiRequest): string | null {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id || !LANDING_ID_RE.test(id)) return null
  return id
}
