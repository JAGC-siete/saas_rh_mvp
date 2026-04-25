import { createAdminClient, createClient } from '../../lib/supabase/server'
import { getTodayInHonduras, getHondurasTime, nowInHonduras } from '../../lib/timezone'
import { incrementUsage } from '../../lib/billing/enforce'
import { resolveEffectiveWorkScheduleId } from '../../lib/attendance/effective-work-schedule'
import { 
  getAchievementTypeByName, 
  validateAchievementRequirements, 
  calculateAttendancePoints,
  updateEmployeeScoreAtomic,
  evaluateAndAwardAchievements
} from '../../lib/gamification-utils'

// Legacy function - now using gamification-utils
async function calculateAttendancePointsLegacy(employeeId: string, lateMinutes: number, isEarly: boolean): Promise<number> {
  return calculateAttendancePoints(lateMinutes, isEarly, lateMinutes === 0)
}

// Legacy function - now using gamification-utils
async function updateEmployeeScoreLegacy(employeeId: string, companyId: string, points: number, reason: string, actionType: string) {
  return await updateEmployeeScoreAtomic(employeeId, companyId, points, reason, actionType)
}

async function checkForAchievements(employeeId: string, companyId: string): Promise<any[]> {
  const supabase = createAdminClient()
  const achievements: any[] = []
  
  try {
    // Get achievement types dynamically
    const perfectWeekType = await getAchievementTypeByName('Perfect Week')
    if (!perfectWeekType) {
      console.warn('Perfect Week achievement type not found')
      return achievements
    }

    // Check for "Perfect Week" achievement (5 days punctual this week)
    const startOfWeek = nowInHonduras()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const { data: weeklyRecords } = await supabase
      .from('attendance_records')
      .select('late_minutes, date, status')
      .eq('employee_id', employeeId)
      .gte('date', startOfWeek.toISOString().split('T')[0])
      .lte('date', getTodayInHonduras())
    
    if (weeklyRecords && weeklyRecords.length >= 5) {
      // Use utility function to validate achievement
      const isValid = validateAchievementRequirements(perfectWeekType, weeklyRecords)
      
      if (isValid) {
        // Check if achievement already exists for this week
        const { data: existingAchievement } = await supabase
          .from('employee_achievements')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('achievement_type_id', perfectWeekType.id)
          .gte('earned_at', startOfWeek.toISOString())
          .single()
        
        if (!existingAchievement) {
          const { data: newAchievement } = await supabase
            .from('employee_achievements')
            .insert({
              employee_id: employeeId,
              achievement_type_id: perfectWeekType.id,
              company_id: companyId,
              points_earned: perfectWeekType.points_reward
            })
            .select('*, achievement_types(*)')
            .single()
          
          if (newAchievement) {
            achievements.push(newAchievement)
            // Award bonus points using atomic update
            await updateEmployeeScoreAtomic(
              employeeId, 
              companyId, 
              perfectWeekType.points_reward, 
              'Perfect Week Achievement', 
              'achievement'
            )
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error)
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
        console.warn('Employee not found by last5', { last5, body: req.body })
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
        console.warn('Employee not found by employee_id', { employee_id, body: req.body })
        return res.status(404).json({ error: 'Employee not found' })
      }
      employee = data
    } else {
      return res.status(400).json({ error: 'Either last5 or employee_id required' })
    }

    const today = getTodayInHonduras()
    const now = getHondurasTime()
    
    // Check if attendance record exists for today
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (!existingRecord) {
      // Check-in
      const eff = await resolveEffectiveWorkScheduleId({
        supabase,
        companyId: employee.company_id ?? '',
        employeeId: employee.id,
        date: today,
        fallbackWorkScheduleId: employee.work_schedule_id
      })
      const { data: schedule } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', eff.found ? eff.workScheduleId : (employee.work_schedule_id ?? ''))
        .single()

      // Get today's expected start time based on day of week
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayName = dayNames[dayOfWeek]
      const expectedCheckIn = (schedule as Record<string, any>)?.[`${todayName}_start`] || (schedule as Record<string, any>)?.monday_start || '08:00'
      
      const currentTime = now.toTimeString().slice(0, 5)
      
      const shiftType = ((schedule as Record<string, any>)?.shift_type as string | undefined) || 'normal'
      const lateGrace = Number((schedule as Record<string, any>)?.late_grace_minutes ?? 5)

      // Calculate if late (normal shift). Flexible shift doesn't penalize by clock time.
      const [expectedHour, expectedMin] = expectedCheckIn.split(':').map(Number)
      const [currentHour, currentMin] = currentTime.split(':').map(Number)
      const expectedMinutes = expectedHour * 60 + expectedMin
      const currentMinutes = currentHour * 60 + currentMin
      const rawLateMinutes = Math.max(0, currentMinutes - expectedMinutes)
      const lateMinutes = shiftType === 'flex' ? 0 : rawLateMinutes

      if (shiftType !== 'flex' && lateMinutes > lateGrace && !justification) {
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
          late_minutes: shiftType === 'flex' ? null : lateMinutes,
          justification: justification || null,
          status: shiftType === 'flex' ? 'present' : lateMinutes > lateGrace ? 'late' : 'present'
        })
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      // Increment usage meter for attendance recording
      try {
        await incrementUsage(supabase, employee.company_id ?? '', 'create_employee') // Using create_employee as closest action
      } catch (error) {
        console.warn('Failed to increment usage meter:', error)
        // Don't fail the request if usage tracking fails
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
      const startOfWeek = nowInHonduras()
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
      const pointsEarned = await calculateAttendancePointsLegacy(employee.id, lateMinutes, isEarly)
      
      if (pointsEarned > 0) {
        await updateEmployeeScoreLegacy(
          employee.id, 
          employee.company_id ?? '', 
          pointsEarned,
          `Check-in: ${punctualityStatus}`,
          'check_in'
        )
      }

      // Check for new achievements across all types
      const newAchievements = await evaluateAndAwardAchievements(employee.id, employee.company_id ?? '')

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
      const eff = await resolveEffectiveWorkScheduleId({
        supabase,
        companyId: employee.company_id ?? '',
        employeeId: employee.id,
        date: today,
        fallbackWorkScheduleId: employee.work_schedule_id
      })
      const { data: schedule } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', eff.found ? eff.workScheduleId : (employee.work_schedule_id ?? ''))
        .single()

      // Get today's expected end time based on day of week
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayName = dayNames[dayOfWeek]
      const expectedCheckOut = (schedule as Record<string, any>)?.[`${todayName}_end`] || (schedule as Record<string, any>)?.monday_end || '17:00'
      
      const currentTime = now.toTimeString().slice(0, 5)
      
      const shiftType = ((schedule as Record<string, any>)?.shift_type as string | undefined) || 'normal'
      const earlyGrace = Number((schedule as Record<string, any>)?.early_grace_minutes ?? 5)

      // Calculate early departure (normal shift). Flexible shift doesn't penalize by clock time.
      const [expectedHour, expectedMin] = expectedCheckOut.split(':').map(Number)
      const [currentHour, currentMin] = currentTime.split(':').map(Number)
      const expectedMinutes = expectedHour * 60 + expectedMin
      const currentMinutes = currentHour * 60 + currentMin
      const rawEarlyDepartureMinutes = Math.max(0, expectedMinutes - currentMinutes)
      const earlyDepartureMinutes = shiftType === 'flex' ? 0 : rawEarlyDepartureMinutes

      // Update record with check-out
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          check_out: now.toISOString(),
          expected_check_out: expectedCheckOut,
          early_departure_minutes: shiftType === 'flex' ? null : earlyDepartureMinutes,
          updated_at: now.toISOString()
        })
        .eq('id', existingRecord.id)
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      // Increment usage meter for attendance recording
      try {
        await incrementUsage(supabase, employee.company_id ?? '', 'create_employee') // Using create_employee as closest action
      } catch (error) {
        console.warn('Failed to increment usage meter:', error)
        // Don't fail the request if usage tracking fails
      }

      const message = shiftType !== 'flex' && earlyDepartureMinutes > earlyGrace
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
    const supabase = createClient(req, res)
    
    // ✅ Get user with getUser() to validate token with Supabase server
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = user.id

    // Verificar permisos del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', userId)
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
      query = query.eq('employee_id', Array.isArray(employee_id) ? employee_id[0] : employee_id as string)
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
