import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess, type AuthenticatedUser } from '../auth/api-auth-fixed'
import { canUseAccounting } from './access-rules'

/**
 * requireCompanyAccess + accounting role check. Returns null after sending 403,
 * so handlers must `if (!auth) return`.
 */
export async function requireAccountingAccess(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedUser | null> {
  const auth = await requireCompanyAccess(req, res)
  if (!canUseAccounting(auth.role)) {
    res.status(403).json({
      error:
        'No tienes permiso para usar Contabilidad. Pídele acceso al administrador de tu empresa.'
    })
    return null
  }
  return auth
}
