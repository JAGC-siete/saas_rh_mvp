import { DateTime } from 'luxon'
import { createAdminClient } from '../supabase/server'
import { updateEmployeeScoreAtomic } from '../gamification-utils'
import { HONDURAS_TIMEZONE } from '../timezone'

export const HABIT_AREAS = ['emotional', 'finance', 'learning', 'nutrition'] as const
export type HabitArea = (typeof HABIT_AREAS)[number]

export const HABIT_AREA_LABELS: Record<HabitArea, string> = {
  emotional: 'Inteligencia emocional',
  finance: 'Finanzas personales',
  learning: 'Aprendizaje',
  nutrition: 'Nutrición',
}

export interface HabitDefinition {
  id: number
  area: HabitArea
  name: string
  description: string | null
  icon: string
  points_per_completion: number
  sort_order: number
}

export interface WeekProgressDay {
  date: string
  done: boolean
}

export interface HabitStatus {
  id: number
  area: HabitArea
  name: string
  description: string | null
  icon: string
  points_per_completion: number
  sort_order: number
  following: boolean
  completedToday: boolean
  currentStreak: number
  weekProgress: WeekProgressDay[]
}

export function addDays(dateStr: string, days: number): string {
  return DateTime.fromISO(dateStr, { zone: HONDURAS_TIMEZONE }).plus({ days }).toISODate()!
}

export function computeCurrentStreak(logDates: Set<string>, today: string): number {
  const hasToday = logDates.has(today)
  const yesterday = addDays(today, -1)

  if (!hasToday && !logDates.has(yesterday)) {
    return 0
  }

  const anchor = hasToday ? today : yesterday
  let streak = 0
  let cursor = anchor

  while (logDates.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }

  return streak
}

export function computeWeekProgress(logDates: Set<string>, today: string): WeekProgressDay[] {
  const result: WeekProgressDay[] = []
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i)
    result.push({ date, done: logDates.has(date) })
  }
  return result
}

export function buildHabitStatus(
  definition: HabitDefinition,
  following: boolean,
  logDatesForHabit: string[],
  today: string
): HabitStatus {
  const logDates = new Set(logDatesForHabit)
  return {
    id: definition.id,
    area: definition.area,
    name: definition.name,
    description: definition.description,
    icon: definition.icon,
    points_per_completion: definition.points_per_completion,
    sort_order: definition.sort_order,
    following,
    completedToday: logDates.has(today),
    currentStreak: computeCurrentStreak(logDates, today),
    weekProgress: computeWeekProgress(logDates, today),
  }
}

export async function awardHabitPoints(
  employeeId: string,
  companyId: string,
  habitName: string,
  points: number
): Promise<boolean> {
  return updateEmployeeScoreAtomic(
    employeeId,
    companyId,
    points,
    `Hábito: ${habitName}`,
    'habit'
  )
}

export async function checkAndAwardHabitAchievements(
  employeeId: string,
  companyId: string,
  currentStreak: number
): Promise<number> {
  if (currentStreak <= 0) return 0

  const supabase = createAdminClient()
  const { data: allTypes, error: typesError } = await supabase
    .from('achievement_types')
    .select('id, name, points_reward, requirements')

  if (typesError || !allTypes?.length) return 0

  const achievementTypes = allTypes.filter(
    (type) => (type.requirements as { type?: string } | null)?.type === 'habit_streak'
  )

  if (!achievementTypes.length) return 0

  let totalBonus = 0

  for (const type of achievementTypes) {
    const requirements = type.requirements as { required_days?: number } | null
    const requiredDays = requirements?.required_days ?? 0
    if (currentStreak < requiredDays) continue

    const { data: existing } = await supabase
      .from('employee_achievements')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('achievement_type_id', type.id)
      .maybeSingle()

    if (existing) continue

    const { error: insertError } = await supabase.from('employee_achievements').insert({
      employee_id: employeeId,
      achievement_type_id: type.id,
      company_id: companyId,
      points_earned: type.points_reward ?? 0,
    })

    if (insertError) {
      if (insertError.code === '23505') continue
      console.error('Error awarding habit achievement:', insertError)
      continue
    }

    const bonus = type.points_reward ?? 0
    await updateEmployeeScoreAtomic(
      employeeId,
      companyId,
      bonus,
      `${type.name} Achievement`,
      'achievement'
    )
    totalBonus += bonus
  }

  return totalBonus
}
