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
    
    // Cache corto para performance
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    res.status(200).json({ success: true, roles })
  } catch (e: any) {
    res.status(200).json({ success: false, roles: [], error: e.message })
  }
}
