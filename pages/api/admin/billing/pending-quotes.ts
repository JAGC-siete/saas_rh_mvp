import type { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireSuperAdmin(req, res)
    const companyId = req.query.company_id as string | undefined

    const adminClient = createAdminClient()
    let query = adminClient
      .from('cotizaciones')
      .select(
        'id, company_id, company_name, status, payment_status, meta, terminals_count, employees_count, expected_deposit_hnl, expected_total_hnl, total, currency, created_at'
      )
      .eq('status', 'sent')
      .in('payment_status', ['pending', 'unknown_legacy'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query
    if (error) throw error

    return res.status(200).json({
      success: true,
      data: data || [],
    })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending quotes',
    })
  }
}
