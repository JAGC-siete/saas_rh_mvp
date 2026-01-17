import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    await requireSuperAdmin(req, res)
    const { id } = req.query
    const { status } = req.body

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID de comisión inválido.' })
    }

    if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido.' })
    }

    const supabase = createAdminClient()

    const updateData: any = { status }
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('commissions')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    res.status(200).json({ message: 'Comisión actualizada correctamente.' })
  } catch (error: any) {
    console.error('Error updating commission:', error)
    if (error.message !== 'UNAUTHORIZED' && error.message !== 'INSUFFICIENT_PERMISSIONS') {
      res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
    }
  }
}








