import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, userProfile } = await requireUser(req, res)
    const { id } = req.query

    if (!userProfile?.company_id) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const companyId = userProfile.company_id

    switch (req.method) {
      case 'PUT':
        const { name, description } = req.body
        
        if (!name) {
          return res.status(400).json({ error: 'Department name is required' })
        }

        const { data: updatedDept, error: updateError } = await supabase
          .from('departments')
          .update({ name, description: description || null })
          .eq('id', id)
          .eq('company_id', companyId)
          .select()
          .single()

        if (updateError) throw updateError
        return res.json({ department: updatedDept })

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from('departments')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId)

        if (deleteError) throw deleteError
        return res.status(204).end()

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Department API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
