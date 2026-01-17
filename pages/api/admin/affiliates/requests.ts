import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Verificar que es super admin
    await requireSuperAdmin(req, res)

    const supabase = createAdminClient()

    // Obtener todas las solicitudes de afiliados
    const { data: requests, error: requestsError } = await supabase
      .from('affiliate_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (requestsError) throw requestsError

    res.status(200).json({ requests: requests || [] })
  } catch (error: any) {
    console.error('Error fetching affiliate requests:', error)
    return res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
  }
}








