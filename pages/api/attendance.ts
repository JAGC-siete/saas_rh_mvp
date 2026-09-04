import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'POST':
      res.setHeader('Allow', ['GET'])
      return res.status(410).json({
        error: 'Gone',
        message: 'POST /api/attendance está deshabilitado. El kiosco público (DNI/last5) no está disponible.',
      })
    case 'GET':
      return getAttendanceRecords(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}

async function getAttendanceRecords(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(req, res)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['company_admin', 'hr_manager', 'super_admin', 'manager'].includes(userProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { employee_id, start_date, end_date, page = 1, limit = 50 } = req.query

    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        employees:employee_id (
          name,
          employee_code,
          dni
        )
      `)
      .order('date', { ascending: false })

    if (userProfile.company_id) {
      query = query.eq('company_id', userProfile.company_id)
    }

    if (employee_id) {
      query = query.eq('employee_id', Array.isArray(employee_id) ? employee_id[0] : employee_id as string)
    }

    if (start_date) {
      query = query.gte('date', start_date)
    }

    if (end_date) {
      query = query.lte('date', end_date)
    }

    const from = (Number(page) - 1) * Number(limit)
    const to = from + Number(limit) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    })
  } catch (error) {
    console.error('Get attendance error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
