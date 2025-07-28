import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { employeeId, startDate } = req.body

    if (!employeeId || !startDate) {
      return res.status(400).json({ error: 'employeeId and startDate are required' })
    }

    // Use admin client for pattern analysis
    const supabase = createAdminClient()

    // Calculate end of week (6 days after start)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get attendance records for the week
    const { data: attendanceRecords, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        date,
        check_in,
        expected_check_in,
        late_minutes,
        status,
        employees!inner (
          id,
          work_schedules (
            monday_start,
            tuesday_start,
            wednesday_start,
            thursday_start,
            friday_start,
            saturday_start,
            sunday_start
          )
        )
      `)
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDateStr)
      .order('date', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Error fetching attendance records' })
    }

    // Analyze punctuality patterns
    let lateDays = 0
    let earlyDays = 0
    let onTimeDays = 0
    const totalDays = attendanceRecords?.length || 0

    if (attendanceRecords && attendanceRecords.length > 0) {
      attendanceRecords.forEach(record => {
        if (!record.check_in || !record.expected_check_in) return

        const checkInTime = new Date(record.check_in)
        const checkInTimeStr = checkInTime.toTimeString().slice(0, 5)
        const expectedTime = record.expected_check_in

        // Calculate punctuality
        const [checkHour, checkMin] = checkInTimeStr.split(':').map(Number)
        const [expectedHour, expectedMin] = expectedTime.split(':').map(Number)
        
        const checkMinutes = checkHour * 60 + checkMin
        const expectedMinutes = expectedHour * 60 + expectedMin
        const minutesDiff = checkMinutes - expectedMinutes

        if (minutesDiff <= -5) {
          earlyDays++
        } else if (minutesDiff <= 5) {
          onTimeDays++
        } else {
          lateDays++
        }
      })
    }

    const weeklyPattern = {
      lateDays,
      earlyDays,
      onTimeDays,
      totalDays,
      // Additional metrics for advanced analysis
      averageLateMinutes: attendanceRecords?.reduce((sum, record) => {
        return sum + (record.late_minutes || 0)
      }, 0) / Math.max(totalDays, 1),
      consistencyScore: totalDays > 0 ? (earlyDays + onTimeDays) / totalDays : 0
    }

    return res.status(200).json(weeklyPattern)

  } catch (error) {
    console.error('Weekly pattern analysis error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
