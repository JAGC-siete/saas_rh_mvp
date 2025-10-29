import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { getDateRange } from '../../../../lib/attendance'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const { preset = 'week', from, to } = req.query
  
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!id) {
      return res.status(400).json({ error: 'Employee ID is required' })
    }

    const range = typeof from === 'string' && typeof to === 'string'
      ? { from, to }
      : getDateRange(preset as string)

    // Get timeline of events
    const { data: timeline, error: timelineError } = await supabase.rpc('attendance_employee_timeline', {
      p_employee_id: id as string,
      p_from: range.from,
      p_to: range.to
    })
    
    if (timelineError) {
      console.error('attendance_employee_timeline error', timelineError)
      return res.status(500).json({ error: timelineError.message })
    }

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        employee_code,
        dni,
        role,
        team,
        department_id,
        work_schedule_id,
        departments:department_id(
          id,
          name
        ),
        work_schedules:work_schedule_id(
          id,
          name,
          monday_start,
          monday_end,
          tuesday_start,
          tuesday_end,
          wednesday_start,
          wednesday_end,
          thursday_start,
          thursday_end,
          friday_start,
          friday_end,
          saturday_start,
          saturday_end,
          sunday_start,
          sunday_end
        )
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (employeeError || !employee) {
      console.error('Error fetching employee details:', employeeError)
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Get today's day of week for expected check-in
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayName = dayNames[dayOfWeek]
    const schedule = employee.work_schedules as any
    
    // Get expected check-in time for today
    const expectedCheckIn = schedule?.[`${todayName}_start`] || schedule?.monday_start || null

    // Calculate attendance average (present days / total days in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: presentDays } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .not('check_in', 'is', null)
    
    const attendanceAverage = presentDays ? ((presentDays / 30) * 100).toFixed(1) : 0

    res.status(200).json({
      employee,
    timeline: timeline || [],
      stats: {
        attendanceAverage: `${attendanceAverage}%`,
        presentDays: presentDays || 0,
        totalDays: 30
      },
      schedule: {
        expectedCheckIn,
        scheduleName: schedule?.name
      }
    })
  } catch (error: any) {
    console.error('Error in employee detail API:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
