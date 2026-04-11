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
    
    const supabase = createAdminClient()
    const countryFilter =
      typeof req.query.country_code === 'string' && req.query.country_code.trim()
        ? req.query.country_code.trim().toUpperCase()
        : null

    let q = supabase.from('tax_brackets').select('*')
    if (countryFilter) {
      q = q.eq('country_code', countryFilter)
    }
    const { data, error } = await q.order('year', { ascending: false })
    
    if (error) {
      console.error('Error fetching tax brackets:', error)
      return res.status(500).json({ error: 'Error fetching tax brackets' })
    }
    
    return res.status(200).json({ 
      success: true,
      brackets: data || []
    })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    console.error('Error in tax-brackets list:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

