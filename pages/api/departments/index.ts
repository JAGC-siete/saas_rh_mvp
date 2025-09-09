import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, userProfile } = await requireUser(req, res)
    
    if (!userProfile?.company_id) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const companyId = userProfile.company_id

    switch (req.method) {
      case 'GET':
        const { data: departments, error: fetchError } = await supabase
          .from('departments')
          .select('*')
          .eq('company_id', companyId)
          .order('name')

        if (fetchError) throw fetchError
        return res.json({ departments })

      case 'POST':
        const { name, description } = req.body
        
        if (!name) {
          return res.status(400).json({ error: 'Department name is required' })
        }

        const { data: newDept, error: createError } = await supabase
          .from('departments')
          .insert([{
            company_id: companyId,
            name,
            description: description || null
          }])
          .select()
          .single()

        if (createError) throw createError
        return res.status(201).json({ department: newDept })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Departments API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}