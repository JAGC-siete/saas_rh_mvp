import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify super admin
    await requireSuperAdmin(req, res)
    
    const { year } = req.query
    
    if (!year || isNaN(Number(year))) {
      return res.status(400).json({ error: 'Year parameter is required and must be a number' })
    }
    
    const supabase = createAdminClient()
    
    // Get tax bracket for specific year
    const { data, error } = await supabase
      .from('tax_brackets')
      .select('*')
      .eq('year', Number(year))
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Tax bracket not found for this year' })
      }
      console.error('Error fetching tax bracket:', error)
      return res.status(500).json({ error: 'Error fetching tax bracket' })
    }
    
    return res.status(200).json({ 
      success: true,
      bracket: data
    })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    console.error('Error in tax-brackets get:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

