import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../../lib/security/error-handling'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, ids } = req.body as { action: 'activate' | 'deactivate' | 'delete'; ids: string[] }

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    // Verify super admin using standardized auth
    await requireSuperAdmin(req, res)
    
    // Use admin client for all database operations (bypasses RLS)
    const supabase = createAdminClient()

    if (action === 'delete') {
      // Safety: ensure no employees or users exist
      const { data: hasDepsEmp } = await supabase
        .from('employees')
        .select('company_id')
        .in('company_id', ids)
        .limit(1)

      const { data: hasDepsUsers } = await supabase
        .from('user_profiles')
        .select('company_id')
        .in('company_id', ids)
        .limit(1)

      if ((hasDepsEmp && hasDepsEmp.length > 0) || (hasDepsUsers && hasDepsUsers.length > 0)) {
        return res.status(409).json({ error: 'Some companies have employees or users; cannot delete.' })
      }
    }

    if (action === 'activate' || action === 'deactivate') {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: action === 'activate' })
        .in('id', ids)
      if (error) throw error
    } else if (action === 'delete') {
      // Soft delete: mark deleted_at now and disable
      const { error } = await supabase
        .from('companies')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .in('id', ids)
      if (error) throw error
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    // If error is from requireSuperAdmin, it already sent response
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    return res.status(500).json(createSecureErrorResponse(error))
  }
}


