import { createAdminClient } from '../../lib/supabase/server'

// Gamification helper functions
async function calculateAttendancePoints(employeeId: number, lateMinutes: number, isEarly: boolean): Promise<number> {
  let points = 5 // Base points for attendance
  
  if (isEarly) points += 3 // Early arrival bonus
  if (lateMinutes <= 5) points += 2 // Punctuality bonus
  if (lateMinutes === 0) points += 5 // Perfect attendance bonus
  if (lateMinutes > 5) points -= Math.min(10, Math.floor(lateMinutes / 5)) // Late penalty
  
  return Math.max(0, points)
}

async function updateEmployeeScore(employeeId: number, companyId: number, points: number, reason: string, actionType: string) {
  const supabase = createAdminClient()
  
  // Update or insert employee score
  const { data: existingScore } = await supabase
    .from('employee_scores')
    .select('*')
    .eq('employee_id', employeeId)
    .single()
  
  if (existingScore) {
    await supabase
      .from('employee_scores')
      .update({
        total_points: existingScore.total_points + points,
        weekly_points: existingScore.weekly_points + points,
        monthly_points: existingScore.monthly_points + points,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
  } else {
    await supabase
      .from('employee_scores')
      .insert({
        employee_id: employeeId,
        company_id: companyId,
        total_points: points,
        weekly_points: points,
        monthly_points: points
      })
  }
  
  // Record in point history
  await supabase
    .from('point_history')
    .insert({
      employee_id: employeeId,
      company_id: companyId,
      points_earned: points,
      reason,
      action_type: actionType
    })
}

async function checkForAchievements(employeeId: number, companyId: number): Promise<any[]> {
  const supabase = createAdminClient()
  
  // This is a simplified version - would need more complex logic for real achievements
  const achievements: any[] = []
  
  // Check for "Perfect Week" achievement (5 days punctual this week)
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const { data: weeklyRecords } = await supabase
    .from('attendance_records')
    .select('late_minutes')
    .eq('employee_id', employeeId)
    .gte('date', startOfWeek.toISOString().split('T')[0])
    .lte('date', new Date().toISOString().split('T')[0])
  
  if (weeklyRecords && weeklyRecords.length >= 5) {
    const punctualDays = weeklyRecords.filter(r => (r.late_minutes || 0) <= 5).length
    if (punctualDays >= 5) {
      // Check if achievement already exists
      const { data: existingAchievement } = await supabase
        .from('employee_achievements')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('achievement_type_id', 1) // Perfect Week achievement
        .gte('earned_at', startOfWeek.toISOString())
        .single()
      
      if (!existingAchievement) {
        const { data: newAchievement } = await supabase
          .from('employee_achievements')
          .insert({
            employee_id: employeeId,
            achievement_type_id: 1,
            company_id: companyId,
            points_earned: 50
          })
          .select('*, achievement_types(*)')
          .single()
        
        if (newAchievement) {
          achievements.push(newAchievement)
          // Award bonus points
          await updateEmployeeScore(employeeId, companyId, 50, 'Perfect Week Achievement', 'achievement')
        }
      }
    }
  }
  
  return achievements
}
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

    // For public attendance registration, we don't require authentication
    // Use admin client to access the database
    const supabase = createAdminClient()

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

      // Generate personalized feedback based on punctuality
      let feedbackMessage = ''
      let punctualityStatus = 'on-time'
      
      if (lateMinutes > 5) {
        feedbackMessage = '⏰ Por favor sé puntual. Explícanos qué pasó.'
        punctualityStatus = 'late'
      } else if (currentMinutes <= expectedMinutes - 5) {
        feedbackMessage = '🎉 ¡Eres un empleado ejemplar! Llegaste temprano.'
        punctualityStatus = 'early'
      } else {
        feedbackMessage = '✅ ¡Perfecto! Llegaste puntualmente.'
        punctualityStatus = 'on-time'
      }

      // Get weekly pattern for behavioral analysis
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      
      const { data: weeklyRecords } = await supabase
        .from('attendance_records')
        .select('late_minutes, status, check_in, expected_check_in')
        .eq('employee_id', employee.id)
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
      
      // Analyze behavioral pattern and enhance feedback
      let behavioralFeedback = ''
      if (weeklyRecords && weeklyRecords.length >= 3) {
        const lateDaysThisWeek = weeklyRecords.filter(r => (r.late_minutes || 0) > 5).length
        const earlyDaysThisWeek = weeklyRecords.filter(r => {
          if (!r.check_in || !r.expected_check_in) return false
          const checkTime = new Date(r.check_in).toTimeString().slice(0, 5)
          const expectedTime = r.expected_check_in
          const [checkHour, checkMin] = checkTime.split(':').map(Number)
          const [expHour, expMin] = expectedTime.split(':').map(Number)
          return (checkHour * 60 + checkMin) <= (expHour * 60 + expMin - 5)
        }).length
        
        if (lateDaysThisWeek >= 3) {
          behavioralFeedback = ' 📊 Hemos notado tardanzas recurrentes esta semana. Por favor mejora tu puntualidad.'
        } else if (earlyDaysThisWeek >= 3 && lateDaysThisWeek === 0) {
          behavioralFeedback = ' 🏆 ¡Excelente consistencia esta semana! Mantén esa disciplina.'
        }
      }
      
      // Combine messages
      const finalFeedback = feedbackMessage + behavioralFeedback

      // Calculate and award points for gamification
      const isEarly = currentMinutes <= expectedMinutes - 5
      const pointsEarned = await calculateAttendancePoints(employee.id, lateMinutes, isEarly)
      
      if (pointsEarned > 0) {
        await updateEmployeeScore(
          employee.id, 
          employee.company_id, 
          pointsEarned,
          `Check-in: ${punctualityStatus}`,
          'check_in'
        )
      }

      // Check for new achievements
      const newAchievements = await checkForAchievements(employee.id, employee.company_id)

      const message = lateMinutes <= 5 
        ? '✅ Check-in recorded successfully'
        : '📝 Late check-in recorded with justification'

      return res.status(200).json({ 
        message, 
        feedbackMessage: finalFeedback,
        punctualityStatus,
        data, 
        lateMinutes,
        gamification: {
          pointsEarned,
          newAchievements: newAchievements.length > 0 ? newAchievements : undefined
        },
        weeklyPattern: {
          totalDays: weeklyRecords?.length || 0,
          lateDays: weeklyRecords ? weeklyRecords.filter(r => (r.late_minutes || 0) > 5).length : 0,
          earlyDays: weeklyRecords ? weeklyRecords.filter(r => {
            if (!r.check_in || !r.expected_check_in) return false
            const checkTime = new Date(r.check_in).toTimeString().slice(0, 5)
            const expectedTime = r.expected_check_in
            const [checkHour, checkMin] = checkTime.split(':').map(Number)
            const [expHour, expMin] = expectedTime.split(':').map(Number)
            return (checkHour * 60 + checkMin) <= (expHour * 60 + expMin - 5)
          }).length : 0
        }
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
    // Validar autenticación para obtener registros
    const { createClient } = await import('../../lib/supabase/server')
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verificar permisos del usuario
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
