
import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createAdminClient()
  const { employeeId } = req.query

  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID is required' })
  }

  try {
    // Get attendance records for the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching attendance records:', error)
      return res.status(500).json({ error: 'Failed to fetch attendance records' })
    }

    // Group records by day
    const dailyPatterns = records?.reduce((acc, record) => {
      const date = new Date(record.created_at).toDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(record)
      return acc
    }, {} as Record<string, any[]>) || {}

    // Analyze patterns
    const patternAnalysis = Object.entries(dailyPatterns).map(([date, dayRecords]: [string, any]) => {
      const checkIn = dayRecords.find((r: any) => r.type === 'check_in')
      const checkOut = dayRecords.find((r: any) => r.type === 'check_out')
      
      return {
        date,
        checkInTime: checkIn?.created_at || null,
        checkOutTime: checkOut?.created_at || null,
        status: checkIn?.status || 'No check-in',
        totalHours: checkIn && checkOut ? 
          (new Date(checkOut.created_at).getTime() - new Date(checkIn.created_at).getTime()) / (1000 * 60 * 60) : 0
      }
    })

    return res.status(200).json({
      employeeId,
      weeklyPattern: patternAnalysis,
      summary: {
        totalDays: patternAnalysis.length,
        averageHours: patternAnalysis.reduce((sum, day) => sum + day.totalHours, 0) / patternAnalysis.length || 0,
        onTimeDays: patternAnalysis.filter(day => day.status === 'A tiempo').length,
        lateDays: patternAnalysis.filter(day => day.status === 'Tarde').length
      }
    })

  } catch (error) {
    console.error('Weekly pattern analysis error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}