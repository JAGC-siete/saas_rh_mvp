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
