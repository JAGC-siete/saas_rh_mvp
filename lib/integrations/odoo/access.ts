import type { NextApiResponse } from 'next'
import type { AuthenticatedUser } from '../../auth/api-auth-fixed'
import { PAYROLL_NAV_ROLES, normalizeRole } from '../../auth/role-access'
import { normalizePermissionsToCanonical } from '../../security/canonical-permissions'
import { OdooTransportError } from './types'

export function canManageOdooIntegration(role: unknown, permissions?: unknown): boolean {
  const r = normalizeRole(role)
  if (r === 'super_admin') return true
  if (r && (PAYROLL_NAV_ROLES as readonly string[]).includes(r)) return true
  const canonical = normalizePermissionsToCanonical(role, permissions)
  return canonical.can_manage_payroll === true
}

export class OdooHttpError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'OdooHttpError'
    this.statusCode = statusCode
  }
}

export function assertCanManageOdoo(auth: AuthenticatedUser): void {
  if (!canManageOdooIntegration(auth.role, auth.userProfile?.permissions)) {
    throw new OdooHttpError('No tiene permiso para configurar la integración Odoo', 403)
  }
}

export function resolveOdooCompanyId(
  auth: AuthenticatedUser,
  requested?: string | null
): string {
  const companyId = requested || auth.companyId
  if (!companyId) {
    throw new OdooHttpError(
      'company_id es requerido. Super admin debe enviarlo en el body o query.',
      400
    )
  }
  if (auth.role !== 'super_admin' && auth.companyId && auth.companyId !== companyId) {
    throw new OdooHttpError('No tiene permiso para esta empresa', 403)
  }
  return companyId
}

export function odooApiErrorResponse(res: NextApiResponse, err: unknown) {
  if (err instanceof OdooHttpError) {
    return res.status(err.statusCode).json({ error: err.message })
  }
  if (err instanceof OdooTransportError) {
    return res.status(err.statusCode >= 400 ? err.statusCode : 502).json({ error: err.message })
  }
  const message = err instanceof Error ? err.message : 'Error interno'
  if (message === 'UNAUTHORIZED') {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  console.error('[odoo]', sanitizeSafe(message))
  return res.status(500).json({ error: 'Error interno' })
}

function sanitizeSafe(message: string): string {
  return message
    .replace(/bearer\s+[A-Za-z0-9+/=_-]+/gi, 'bearer [redacted]')
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[redacted]')
}
