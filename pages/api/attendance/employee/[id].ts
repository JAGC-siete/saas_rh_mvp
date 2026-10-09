import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { getDateRange } from '../../../../lib/attendance'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { RAW_PUNCH_EVENT_TYPE } from '../../../../lib/attendance/daily-close'
import { loadEffectiveWorkSchedule } from '../../../../lib/attendance/load-effective-schedule'
import { getTodayInHonduras } from '../../../../lib/timezone'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const { preset = 'week', from, to } = req.query
  
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!id) {
      return res.status(400).json({ error: 'Employee ID is required' })
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
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
    // RPC returns: { date, check_in, check_out, lunch_start?, lunch_end?, late_minutes, status, ... }
    // Group by attendance `date` (local calendar day), NOT UTC from timestamps —
    // evening check-outs in HN are next-day UTC and would otherwise float to the top.
    const timeline = (timelineRaw || []).flatMap((record: any) => {
      const events: any[] = []
      const day =
        typeof record.date === 'string'
          ? record.date.slice(0, 10)
          : record.date
            ? new Date(record.date).toISOString().slice(0, 10)
            : null

      if (record.check_in) {
        events.push({
          ts_local: record.check_in,
          event_type: record.late_minutes > 5 ? 'Entrada tarde' :
                     record.late_minutes < -5 ? 'Entrada temprana' :
                     'Entrada',
          source: 'attendance_system',
          justification: record.late_minutes > 5 ? `Llegó ${record.late_minutes} minutos tarde` : null,
          _day: day,
        })
      }
      if (record.lunch_start) {
        events.push({
          ts_local: record.lunch_start,
          event_type: 'Inicio almuerzo',
          source: 'attendance_system',
          justification: null,
          _day: day,
        })
      }
      if (record.lunch_end) {
        events.push({
          ts_local: record.lunch_end,
          event_type: 'Fin almuerzo',
          source: 'attendance_system',
          justification: null,
          _day: day,
        })
      }
      if (record.check_out) {
        events.push({
          ts_local: record.check_out,
          event_type: 'Salida',
          source: 'attendance_system',
          justification: null,
          _day: day,
        })
      }

      return events
    }).sort((a: any, b: any) => {
      const dayA = a._day || ''
      const dayB = b._day || ''
      if (dayB !== dayA) return dayB.localeCompare(dayA)
      return new Date(a.ts_local).getTime() - new Date(b.ts_local).getTime()
    }).map(({ _day, ...ev }: any) => ev)

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

    const admin = createAdminClient()
    const rangeFromIso = new Date(range.from).toISOString()
    const rangeToIso = new Date(range.to).toISOString()
    const { data: rawPunchRows, error: rawErr } = await admin
      .from('attendance_events')
      .select('id, ts_utc, device_id, event_uid, local_date')
      .eq('employee_id', id as string)
      .eq('event_type', RAW_PUNCH_EVENT_TYPE)
      .gte('ts_utc', rangeFromIso)
      .lt('ts_utc', rangeToIso)
      .order('ts_utc', { ascending: true })

    if (rawErr) {
      console.error('attendance_events raw_punch:', rawErr)
    }

    // Expected check-in for today (effective schedule: assignment → default)
    const today = getTodayInHonduras()
    const loaded = await loadEffectiveWorkSchedule({
      supabase: admin,
      companyId,
      employeeId: id as string,
      date: today,
      fallbackWorkScheduleId: employee.work_schedule_id,
    })
    const expectedCheckIn = loaded.times.start
    const schedule = loaded.schedule ?? (employee.work_schedules as any)

    // Calculate attendance average (present days / working days in last 30 days)
    // Use working days instead of calendar days for more accurate calculation
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Días laborables según el horario del empleado (lun–vie si no hay horario).
    const DAY_START_KEYS = [
      'sunday_start', 'monday_start', 'tuesday_start', 'wednesday_start',
      'thursday_start', 'friday_start', 'saturday_start',
    ] as const
    const scheduleSources = [schedule, employee.work_schedules as any].filter(Boolean)
    const scheduledDows = new Set<number>()
    DAY_START_KEYS.forEach((key, dow) => {
      if (scheduleSources.some((s: any) => s?.[key])) scheduledDows.add(dow)
    })
    if (scheduledDows.size === 0) [1, 2, 3, 4, 5].forEach((d) => scheduledDows.add(d))

    const getWorkingDays = (startDate: Date, endDate: Date): number => {
      let workingDays = 0
      const current = new Date(startDate)
      
      while (current <= endDate) {
        if (scheduledDows.has(current.getDay())) {
          workingDays++
        }
        current.setDate(current.getDate() + 1)
      }
      
      return workingDays
    }
    
    const todayDate = new Date()
    const totalWorkingDays = getWorkingDays(thirtyDaysAgo, todayDate)
    
    // Count present days (days with check_in) in the last 30 days
    const { count: presentDays } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .not('check_in', 'is', null)
    
    // Marcas en días libres pueden superar los días programados: se limita a 100 %.
    const attendanceAverage = totalWorkingDays > 0 && presentDays
      ? Math.min(100, (presentDays / totalWorkingDays) * 100).toFixed(1)
      : '0.0'

    res.status(200).json({
      employee,
      timeline: timeline || [],
      raw_punches: rawPunchRows || [],
      stats: {
        attendanceAverage: `${attendanceAverage}%`,
        presentDays: presentDays || 0,
        totalDays: totalWorkingDays
      },
      schedule: {
        expectedCheckIn,
        expectedCheckOut: loaded.times.end,
        scheduleName: schedule?.name,
        scheduleSource: loaded.result.source,
        dayType: loaded.times.type,
      }
    })
  } catch (error: any) {
    console.error('Error in employee detail API:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
