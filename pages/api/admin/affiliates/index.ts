import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Add Super Admin check
    await requireSuperAdmin(req, res)

    const supabase = createAdminClient()

    // 1. Fetch all affiliates
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('id, user_id, referral_code, status, created_at')

    if (affiliatesError) throw affiliatesError

    // 2. Fetch all auth users and create a map
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers()
    if (authUsersError) throw authUsersError
    
    const usersMap = new Map<string, { email: string, full_name: string }>()
    authUsers.users.forEach(user => {
      usersMap.set(user.id, {
        email: user.email || 'N/A',
        full_name: user.user_metadata?.full_name || 'N/A'
      })
    })

    // 3. Combine the data
    const formattedAffiliates = affiliates.map(affiliate => {
      const user = usersMap.get(affiliate.user_id)
      return {
        ...affiliate,
        user_email: user?.email || 'N/A',
        user_name: user?.full_name || 'N/A',
      }
    })

    res.status(200).json({ affiliates: formattedAffiliates })
  } catch (error: any) {
    console.error('Error fetching affiliates:', error)
    res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
  }
}
