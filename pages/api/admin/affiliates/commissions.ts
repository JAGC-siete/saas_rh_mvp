import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Add Super Admin check
    await requireSuperAdmin(req, res)

    // Placeholder for commission data logic
    // In the future, this will fetch commission data from the database.
    const commissions = [
      { id: 'comm_1', affiliate_id: 'aff_1', amount: 100, status: 'paid', date: '2025-10-15' },
      { id: 'comm_2', affiliate_id: 'aff_1', amount: 150, status: 'pending', date: '2025-11-01' },
      { id: 'comm_3', affiliate_id: 'aff_2', amount: 75, status: 'paid', date: '2025-10-20' },
    ]

    res.status(200).json({ commissions })
  } catch (error: any) {
    // The requireSuperAdmin function handles sending the response on auth failure
    if (error.message !== 'UNAUTHORIZED' && error.message !== 'INSUFFICIENT_PERMISSIONS') {
      console.error('Error fetching commissions:', error)
      res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
    }
  }
}
