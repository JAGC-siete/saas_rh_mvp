import { createClient, createAdminClient } from '../../lib/supabase/server'
import { NextApiRequest, NextApiResponse } from 'next'

// Attendance API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'POST':
      return handleCheckInOut(req, res)
    case 'GET':
      return getAttendanceRecords(req, res)
    default:
      res.setHeader('Allow', ['POST', 'GET'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}

async function handleCheckInOut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { last5, justification, employee_id } = req.body

    // Create Supabase client with cookie handling
    const supabase = createClient(req, res)

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Find employee by last 5 digits of DNI or employee_id
    let employee
    if (last5) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .ilike('dni', `%${last5}`)
        .single()
      
      if (error || !data) {
        return res.status(404).json({ error: 'Employee not found' })
      }
      employee = data
    } else if (employee_id) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employee_id)
        .single()
      
      if (error || !data) {
        return res.status(404).json({ error: 'Employee not found' })
      }
      employee = data
    } else {
      return res.status(400).json({ error: 'Either last5 or employee_id required' })
    }

    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    
    // Check if attendance record exists for today
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (!existingRecord) {
      // Check-in
      const { data: schedule } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', employee.work_schedule_id)
        .single()

      const expectedCheckIn = schedule?.monday_start || '08:00' // Default or from schedule
      const currentTime = now.toTimeString().slice(0, 5)
      
      // Calculate if late
      const [expectedHour, expectedMin] = expectedCheckIn.split(':').map(Number)
      const [currentHour, currentMin] = currentTime.split(':').map(Number)
      const expectedMinutes = expectedHour * 60 + expectedMin
      const currentMinutes = currentHour * 60 + currentMin
      const lateMinutes = Math.max(0, currentMinutes - expectedMinutes)

      if (lateMinutes > 5 && !justification) {
        return res.status(422).json({
          requireJustification: true,
          message: '⏰ You are late. Please provide justification.',
          lateMinutes
        })
      }

      // Insert check-in record
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: today,
          check_in: now.toISOString(),
          expected_check_in: expectedCheckIn,
          late_minutes: lateMinutes,
          justification: justification || null,
          status: lateMinutes > 5 ? 'late' : 'present'
        })
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      const message = lateMinutes <= 5 
        ? '✅ Check-in recorded successfully'
        : '📝 Late check-in recorded with justification'

      return res.status(200).json({ 
        message, 
        data, 
        lateMinutes 
      })

    } else if (!existingRecord.check_out) {
      // Check-out
      const { data: schedule } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', employee.work_schedule_id)
        .single()

      const expectedCheckOut = schedule?.monday_end || '17:00' // Default or from schedule
      const currentTime = now.toTimeString().slice(0, 5)
      
      // Calculate early departure
      const [expectedHour, expectedMin] = expectedCheckOut.split(':').map(Number)
      const [currentHour, currentMin] = currentTime.split(':').map(Number)
      const expectedMinutes = expectedHour * 60 + expectedMin
      const currentMinutes = currentHour * 60 + currentMin
      const earlyDepartureMinutes = Math.max(0, expectedMinutes - currentMinutes)

      // Update record with check-out
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          check_out: now.toISOString(),
          expected_check_out: expectedCheckOut,
          early_departure_minutes: earlyDepartureMinutes,
          updated_at: now.toISOString()
        })
        .eq('id', existingRecord.id)
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      const message = earlyDepartureMinutes > 5
        ? '🔄 Early check-out recorded'
        : '✅ Check-out recorded successfully'

      return res.status(200).json({ 
        message, 
        data, 
        earlyDepartureMinutes 
      })

    } else {
      return res.status(400).json({ 
        error: 'Attendance already completed for today' 
      })
    }

  } catch (error) {
    console.error('Attendance error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getAttendanceRecords(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { employee_id, start_date, end_date, page = 1, limit = 50 } = req.query

    // Create Supabase client with cookie handling
    const supabase = createClient(req, res)

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

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

    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    if (start_date) {
      query = query.gte('date', start_date)
    }

    if (end_date) {
      query = query.lte('date', end_date)
    }

    // Pagination
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
