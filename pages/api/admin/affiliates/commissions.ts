import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    await requireSuperAdmin(req, res)
    const supabase = createAdminClient()

    // Fetch all commissions
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('id, affiliate_id, referred_company_id, amount, status, created_at, paid_at')
      .order('created_at', { ascending: false })

    if (commissionsError) throw commissionsError

    // Fetch affiliates to get names
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('id, user_id')

    if (affiliatesError) throw affiliatesError

    // Fetch auth users to get affiliate names (with pagination)
    const usersMap = new Map<string, string>()
    
    try {
      let page = 1
      let hasMore = true
      const perPage = 1000 // Max per page for listUsers
      
      while (hasMore) {
        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers({
          page,
          perPage
        })
        
        if (authUsersError) {
          console.error('Error fetching auth users page', { 
            page, 
            error: authUsersError?.message || String(authUsersError) 
          })
          break
        }
        
        if (authUsers?.users && authUsers.users.length > 0) {
          authUsers.users.forEach((user: any) => {
            usersMap.set(user.id, user.user_metadata?.full_name || user.email || 'N/A')
          })
          
          // Check if there are more pages
          hasMore = authUsers.users.length === perPage
          page++
        } else {
          hasMore = false
        }
      }
    } catch (authError: any) {
      console.error('Error fetching auth users for commissions', {
        error: authError?.message || String(authError)
      })
      // Continue without user data - commissions will show 'N/A' for affiliate name
    }

    const affiliatesMap = new Map<string, string>()
    affiliates?.forEach(affiliate => {
      const userName = usersMap.get(affiliate.user_id) || 'N/A'
      affiliatesMap.set(affiliate.id, userName)
    })

    // Fetch companies to get names
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')

    if (companiesError) throw companiesError

    const companiesMap = new Map<string, string>()
    companies?.forEach(company => {
      companiesMap.set(company.id, company.name)
    })

    // Combine data
    const formattedCommissions = (commissions || []).map(commission => ({
      ...commission,
      amount: parseFloat(commission.amount || 0),
      affiliate_name: affiliatesMap.get(commission.affiliate_id) || 'N/A',
      company_name: companiesMap.get(commission.referred_company_id) || 'N/A'
    }))

    res.status(200).json({ commissions: formattedCommissions })
  } catch (error: any) {
    console.error('Error fetching commissions:', error)
    if (error.message !== 'UNAUTHORIZED' && error.message !== 'INSUFFICIENT_PERMISSIONS') {
      res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
    }
  }
}
