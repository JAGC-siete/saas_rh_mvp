import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    const { supabase, userProfile } = await requireUser(req, res)
    const { id } = req.query

    if (!userProfile?.company_id) {
      res.status(400).json({ error: 'Company ID required' })
      return
    }

    const companyId = userProfile.company_id

    switch (req.method) {
      case 'PUT':
        const { name, description } = req.body
        
        if (!name) {
          res.status(400).json({ error: 'Department name is required' })
          return
        }

        const { data: updatedDept, error: updateError } = await supabase
          .from('departments')
          .update({ name, description: description || null })
          .eq('id', id)
          .eq('company_id', companyId)
          .select()
          .single()

        if (updateError) throw updateError
        res.json({ department: updatedDept })
        return

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from('departments')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId)

        if (deleteError) throw deleteError
        res.status(204).end()
        return

      default:
        res.status(405).json({ error: 'Method not allowed' })
        return
    }
  } catch (error: any) {
    console.error('Department API error:', error)
    res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
    return
  }
}