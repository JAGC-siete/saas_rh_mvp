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
    const { data: timelineRaw, error: timelineError } = await supabase.rpc('attendance_employee_timeline', {
      p_employee_id: id as string,
      p_from: range.from,
      p_to: range.to
    })
    
    if (timelineError) {
      console.error('attendance_employee_timeline error', timelineError)
      return res.status(500).json({ error: timelineError.message })
    }

    // Transform timeline to match component expectations
    // Component expects: { ts_local: string, event_type: string, source?: string, justification?: string }
    // RPC returns: { date, check_in, check_out, late_minutes, status, expected_check_in, expected_check_out }
    const timeline = (timelineRaw || []).flatMap((record: any) => {
      const events: any[] = []
      
      // Add check-in event if exists
      if (record.check_in) {
        events.push({
          ts_local: record.check_in,
          event_type: record.late_minutes > 5 ? 'Check-in Tarde' : 
                     record.late_minutes < -5 ? 'Check-in Temprano' : 
                     'Check-in',
          source: 'attendance_system',
          justification: record.late_minutes > 5 ? `Llegó ${record.late_minutes} minutos tarde` : null
        })
      }
      
      // Add check-out event if exists
      if (record.check_out) {
        events.push({
          ts_local: record.check_out,
          event_type: 'Check-out',
          source: 'attendance_system',
          justification: null
        })
      }
      
      return events
    }).sort((a, b) => new Date(b.ts_local).getTime() - new Date(a.ts_local).getTime()) // Sort by date descending

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

    // Calculate attendance average (present days / working days in last 30 days)
    // Use working days instead of calendar days for more accurate calculation
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Count working days (Monday-Friday) in the last 30 days
    const getWorkingDays = (startDate: Date, endDate: Date): number => {
      let workingDays = 0
      const current = new Date(startDate)
      
      while (current <= endDate) {
        const dayOfWeek = current.getDay()
        // Count Monday (1) through Friday (5) as working days
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workingDays++
        }
        current.setDate(current.getDate() + 1)
      }
      
      return workingDays
    }
    
    const totalWorkingDays = getWorkingDays(thirtyDaysAgo, today)
    
    // Count present days (days with check_in) in the last 30 days
    const { count: presentDays } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .not('check_in', 'is', null)
    
    const attendanceAverage = totalWorkingDays > 0 && presentDays 
      ? ((presentDays / totalWorkingDays) * 100).toFixed(1) 
      : '0.0'

    res.status(200).json({
      employee,
    timeline: timeline || [],
      stats: {
        attendanceAverage: `${attendanceAverage}%`,
        presentDays: presentDays || 0,
        totalDays: totalWorkingDays
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
