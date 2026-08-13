import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../lib/auth/api-auth-fixed"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    const { data, error } = await supabase
      .from('employees')
      .select('role')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('role', 'is', null)

    if (error) throw error
    
    const roles = Array.from(new Set((data ?? []).map((r: any) => r.role))).sort()
    
    // Auth-bound response: never cache publicly
    res.setHeader('Cache-Control', 'private, no-store')
    res.status(200).json({ success: true, roles })
  } catch (e: any) {
    // Auth helpers already sent 401/403/400 when applicable
    if (res.headersSent) return
    if (e?.message === 'UNAUTHORIZED') {
      return res.status(401).json({
        success: false,
        roles: [],
        error: 'Unauthorized',
        message: 'Sesión inválida o expirada. Vuelve a iniciar sesión.',
      })
    }
    res.status(500).json({ success: false, roles: [], error: e.message })
  }
}
