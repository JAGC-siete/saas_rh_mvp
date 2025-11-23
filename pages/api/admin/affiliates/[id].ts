import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Add Super Admin check
    await requireSuperAdmin(req, res)

    const { id } = req.query
    const { status } = req.body

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID de afiliado inválido.' })
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido.' })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('affiliates')
      .update({ status })
      .eq('id', id)

    if (error) throw error

    res.status(200).json({ message: 'Estado del afiliado actualizado.' })
  } catch (error: any) {
    // The requireSuperAdmin function handles sending the response on auth failure
    if (error.message !== 'UNAUTHORIZED' && error.message !== 'INSUFFICIENT_PERMISSIONS') {
      console.error(`Error updating affiliate ${req.query.id}:`, error)
      res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
    }
  }
}
