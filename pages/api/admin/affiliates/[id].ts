import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { id } = req.query
  const { status } = req.body

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de afiliado inválido.' })
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido.' })
  }

  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('affiliates')
      .update({ status })
      .eq('id', id)

    if (error) throw error

    res.status(200).json({ message: 'Estado del afiliado actualizado.' })
  } catch (error: any) {
    console.error(`Error updating affiliate ${id}:`, error)
    res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
  }
}
