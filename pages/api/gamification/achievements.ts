import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { company_id, employee_id } = req.query

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    let query = supabase
      .from('employee_achievements')
      .select(`
        *,
        achievement_type:achievement_types(*)
      `)
      .eq('company_id', company_id)

    // If employee_id is provided, filter by specific employee
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    const { data: achievements, error } = await query

    if (error) {
      console.error('Achievements fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch achievements' })
    }

    res.status(200).json({
      success: true,
      data: achievements || [],
      total: achievements?.length || 0
    })

  } catch (error) {
    console.error('Achievements API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
