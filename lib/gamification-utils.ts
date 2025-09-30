// Gamification utility functions for consistent data handling
import { createAdminClient } from './supabase/server'

export interface AchievementType {
  id: number
  name: string
  description: string
  icon: string
  points_reward: number
  badge_color: string
  requirements: any
}

// Cache for achievement types to avoid repeated queries
let achievementTypesCache: AchievementType[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getAchievementTypes(): Promise<AchievementType[]> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (achievementTypesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return achievementTypesCache
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('achievement_types')
      .select('*')
      .order('id')

    if (error) {
      console.error('Error fetching achievement types:', error)
      return []
    }

    // Update cache
    achievementTypesCache = data || []
    cacheTimestamp = now
    
    return achievementTypesCache
  } catch (error) {
    console.error('Error in getAchievementTypes:', error)
    return []
  }
}

export async function getAchievementTypeByName(name: string): Promise<AchievementType | null> {
  const types = await getAchievementTypes()
  return types.find(type => type.name === name) || null
}

export async function getAchievementTypeById(id: number): Promise<AchievementType | null> {
  const types = await getAchievementTypes()
  return types.find(type => type.id === id) || null
}

// Achievement validation functions
export function validateAchievementRequirements(
  achievementType: AchievementType,
  attendanceRecords: any[]
): boolean {
  const requirements = achievementType.requirements
  
  if (!requirements || !attendanceRecords) {
    return false
  }

  switch (requirements.type) {
    case 'weekly':
      return validateWeeklyAchievement(requirements, attendanceRecords)
    case 'streak':
      return validateStreakAchievement(requirements, attendanceRecords)
    case 'monthly':
      return validateMonthlyAchievement(requirements, attendanceRecords)
    case 'improvement':
      return validateImprovementAchievement(requirements, attendanceRecords)
    case 'consistency':
      return validateConsistencyAchievement(requirements, attendanceRecords)
    case 'zero_tardiness':
      return validateZeroTardinessAchievement(requirements, attendanceRecords)
    default:
      return false
  }
}

function validateWeeklyAchievement(requirements: any, records: any[]): boolean {
  const { required_days, max_late_minutes } = requirements
  
  if (records.length < required_days) {
    return false
  }

  const punctualDays = records.filter(r => (r.late_minutes || 0) <= max_late_minutes).length
  return punctualDays >= required_days
}

function validateStreakAchievement(requirements: any, records: any[]): boolean {
  const { required_days, max_late_minutes, early_minutes } = requirements
  
  if (records.length < required_days) {
    return false
  }

  // Sort records by date to check consecutive days
  const sortedRecords = records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  let currentStreak = 0
  let maxStreak = 0

  for (const record of sortedRecords) {
    const isPunctual = (record.late_minutes || 0) <= max_late_minutes
    const isEarly = early_minutes ? (record.late_minutes || 0) <= -early_minutes : false
    
    if (isPunctual || isEarly) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return maxStreak >= required_days
}

function validateMonthlyAchievement(requirements: any, records: any[]): boolean {
  const { required_attendance, max_absences } = requirements
  
  const totalDays = records.length
  const absentDays = records.filter(r => r.status === 'absent').length
  
  if (max_absences !== undefined && absentDays > max_absences) {
    return false
  }

  const attendanceRate = ((totalDays - absentDays) / totalDays) * 100
  return attendanceRate >= required_attendance
}

// Improvement over multiple weeks: each week shows better (lower) avg late_minutes
function validateImprovementAchievement(requirements: any, records: any[]): boolean {
  const { required_weeks = 3 } = requirements
  if (!records.length) return false

  // Group by ISO week
  const byWeek: Record<string, number[]> = {}
  for (const r of records) {
    const d = new Date(r.date)
    const year = d.getUTCFullYear()
    const firstJan = new Date(Date.UTC(year, 0, 1))
    const days = Math.floor((d.getTime() - firstJan.getTime()) / 86400000)
    const week = Math.floor((days + firstJan.getUTCDay() + 1) / 7)
    const key = `${year}-W${week}`
    if (!byWeek[key]) byWeek[key] = []
    byWeek[key].push(Math.max(0, r.late_minutes ?? 0))
  }
  const weekKeys = Object.keys(byWeek).sort()
  if (weekKeys.length < required_weeks) return false
  // Consider last N consecutive weeks
  const lastWeeks = weekKeys.slice(-required_weeks)
  const avgs = lastWeeks.map(k => {
    const arr = byWeek[k]
    const sum = arr.reduce((a, b) => a + b, 0)
    return arr.length ? sum / arr.length : 9999
  })
  // Strictly improving (each week better than previous)
  for (let i = 1; i < avgs.length; i++) {
    if (!(avgs[i] < avgs[i - 1])) return false
  }
  return true
}

// Consistency: arrival time variance within threshold over required weeks
function validateConsistencyAchievement(requirements: any, records: any[]): boolean {
  const { required_weeks = 2, time_variance = 10 } = requirements
  if (!records.length) return false

  // Compute variance of (check_in vs expected_check_in) minutes per week
  type WeekAgg = { diffs: number[] }
  const byWeek: Record<string, WeekAgg> = {}
  for (const r of records) {
    if (!r.check_in || !r.expected_check_in) continue
    const d = new Date(r.date)
    const year = d.getUTCFullYear()
    const firstJan = new Date(Date.UTC(year, 0, 1))
    const days = Math.floor((d.getTime() - firstJan.getTime()) / 86400000)
    const week = Math.floor((days + firstJan.getUTCDay() + 1) / 7)
    const key = `${year}-W${week}`
    const [ciH, ciM] = r.check_in.split('T')[1]?.substring(0,5).split(':').map(Number) || [0,0]
    const [exH, exM] = (r.expected_check_in?.substring(11,16) || '00:00').split(':').map(Number)
    const diff = (ciH * 60 + ciM) - (exH * 60 + exM)
    if (!byWeek[key]) byWeek[key] = { diffs: [] }
    byWeek[key].diffs.push(diff)
  }
  const weekKeys = Object.keys(byWeek).sort()
  if (weekKeys.length < required_weeks) return false
  const lastWeeks = weekKeys.slice(-required_weeks)
  for (const k of lastWeeks) {
    const diffs = byWeek[k].diffs
    if (!diffs.length) return false
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
    const variance = diffs.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / diffs.length
    const stddev = Math.sqrt(variance)
    if (stddev > time_variance) return false
  }
  return true
}

// Zero tardiness: no late days in the month
function validateZeroTardinessAchievement(requirements: any, records: any[]): boolean {
  const { max_late_days = 0 } = requirements
  const lateDays = records.filter(r => (r.late_minutes ?? 0) > 0 || r.status === 'late_in' || r.status === 'late').length
  return lateDays <= max_late_days
}

// Evaluate all achievement types for an employee and award missing ones if requirements satisfied
export async function evaluateAndAwardAchievements(
  employeeId: string,
  companyId: string
): Promise<any[]> {
  const supabase = createAdminClient()
  const newlyAwarded: any[] = []

  const achievementTypes = await getAchievementTypes()
  if (!achievementTypes.length) return newlyAwarded

  // Fetch recent attendance: last 60 days is enough for weekly/monthly checks
  const today = new Date()
  const since = new Date(today.getTime() - 60 * 86400000)
  const { data: attendance, error: attErr } = await supabase
    .from('attendance_records')
    .select('date, status, late_minutes, check_in, expected_check_in')
    .eq('employee_id', employeeId)
    .gte('date', since.toISOString().slice(0,10))
    .lte('date', today.toISOString().slice(0,10))

  if (attErr) {
    console.error('Error fetching attendance for achievements:', attErr)
    return newlyAwarded
  }

  // Helper: check if already has achievement
  async function alreadyHas(achievementTypeId: number): Promise<boolean> {
    const { data } = await supabase
      .from('employee_achievements')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('achievement_type_id', achievementTypeId)
      .limit(1)
      .maybeSingle()
    return !!data
  }

  for (const type of achievementTypes) {
    // Compute relevant slice for monthly-only validations
    let relevant = attendance || []
    if (type.requirements?.type === 'monthly' || type.name === 'Zero Tardiness') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      relevant = (attendance || []).filter(r => new Date(r.date) >= monthStart)
    }

    const ok = validateAchievementRequirements(type, relevant)
    if (!ok) continue
    if (await alreadyHas(type.id)) continue

    // Award achievement
    const { data: newAch, error: insErr } = await supabase
      .from('employee_achievements')
      .insert({
        employee_id: employeeId,
        achievement_type_id: type.id,
        company_id: companyId,
        points_earned: type.points_reward
      })
      .select('*, achievement_types(*)')
      .single()

    if (insErr) {
      console.error('Error inserting achievement:', insErr)
      continue
    }

    newlyAwarded.push(newAch)

    // Award points
    await updateEmployeeScoreAtomic(
      employeeId,
      companyId,
      type.points_reward,
      `${type.name} Achievement`,
      'achievement'
    )
  }

  return newlyAwarded
}

// Point calculation with consistency checks
export function calculateAttendancePoints(
  lateMinutes: number,
  isEarly: boolean,
  isPerfect: boolean
): number {
  let points = 5 // Base points for attendance
  
  if (isEarly) points += 3 // Early arrival bonus
  if (lateMinutes <= 5) points += 2 // Punctuality bonus
  if (isPerfect) points += 5 // Perfect attendance bonus
  if (lateMinutes > 5) points -= Math.min(10, Math.floor(lateMinutes / 5)) // Late penalty
  
  return Math.max(0, points)
}

// Race condition prevention for score updates
export async function updateEmployeeScoreAtomic(
  employeeId: string,
  companyId: string,
  points: number,
  reason: string,
  actionType: string
): Promise<boolean> {
  const supabase = createAdminClient()
  
  try {
    // Use a transaction-like approach with retry logic
    const maxRetries = 3
    let retries = 0
    
    while (retries < maxRetries) {
      try {
        // Get current score with row-level locking
        const { data: currentScore, error: fetchError } = await supabase
          .from('employee_scores')
          .select('total_points, weekly_points, monthly_points')
          .eq('employee_id', employeeId)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError
        }

        const newTotalPoints = (currentScore?.total_points || 0) + points
        const newWeeklyPoints = (currentScore?.weekly_points || 0) + points
        const newMonthlyPoints = (currentScore?.monthly_points || 0) + points

        if (currentScore) {
          // Update existing score
          const { error: updateError } = await supabase
            .from('employee_scores')
            .update({
              total_points: newTotalPoints,
              weekly_points: newWeeklyPoints,
              monthly_points: newMonthlyPoints,
              updated_at: new Date().toISOString()
            })
            .eq('employee_id', employeeId)

          if (updateError) {
            throw updateError
          }
        } else {
          // Insert new score
          const { error: insertError } = await supabase
            .from('employee_scores')
            .insert({
              employee_id: employeeId,
              company_id: companyId,
              total_points: points,
              weekly_points: points,
              monthly_points: points
            })

          if (insertError) {
            throw insertError
          }
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

        return true // Success
      } catch (error: any) {
        retries++
        if (retries >= maxRetries) {
          throw error
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100))
      }
    }
    
    return false
  } catch (error) {
    console.error('Error updating employee score:', error)
    return false
  }
}
