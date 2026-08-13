import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../lib/employee-portal/company-settings'
import { getTodayInHonduras } from '../../../../lib/timezone'
import {
  HABIT_AREAS,
  HABIT_AREA_LABELS,
  addDays,
  awardHabitPoints,
  buildHabitStatus,
  checkAndAwardHabitAchievements,
  type HabitArea,
  type HabitDefinition,
  type HabitStatus,
} from '../../../../lib/habits/service'

interface HabitsGetResponse {
  today: string
  areas: Array<{
    area: HabitArea
    label: string
    habits: HabitStatus[]
  }>
  summary: {
    following: number
    completedToday: number
    bestStreak: number
  }
}

interface HabitsPostResponse {
  habit: HabitStatus
  pointsAwarded: number
}

type HabitAction = 'follow' | 'unfollow' | 'complete'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HabitsGetResponse | HabitsPostResponse | { error: string }>
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const ctx = await resolveEmployeeAndCompanyId(supabase, user)
    if (!ctx) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }
    if (!(await assertEmployeePortalEnabled(supabase, ctx.companyId, res))) {
      return
    }

    const { employeeId, companyId } = ctx
    if (!companyId) {
      return res.status(400).json({ error: 'Empresa no encontrada' })
    }

    const today = getTodayInHonduras()
    const logsSince = addDays(today, -60)

    if (req.method === 'GET') {
      const [definitionsResult, enrollmentsResult, logsResult] = await Promise.all([
        supabase
          .from('habit_definitions')
          .select('id, area, name, description, icon, points_per_completion, sort_order')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('employee_habits')
          .select('habit_id, active')
          .eq('employee_id', employeeId),
        supabase
          .from('habit_logs')
          .select('habit_id, log_date')
          .eq('employee_id', employeeId)
          .gte('log_date', logsSince),
      ])

      if (definitionsResult.error) {
        logger.error('Failed to load habit definitions', definitionsResult.error)
        return res.status(500).json({ error: 'Error al cargar hábitos' })
      }
      if (enrollmentsResult.error) {
        logger.error('Failed to load employee habits', enrollmentsResult.error)
        return res.status(500).json({ error: 'Error al cargar inscripciones' })
      }
      if (logsResult.error) {
        logger.error('Failed to load habit logs', logsResult.error)
        return res.status(500).json({ error: 'Error al cargar registros' })
      }

      const definitions = (definitionsResult.data || []) as HabitDefinition[]
      const followingMap = new Map<number, boolean>()
      for (const row of enrollmentsResult.data || []) {
        followingMap.set(row.habit_id, row.active)
      }

      const logsByHabit = new Map<number, string[]>()
      for (const row of logsResult.data || []) {
        const dates = logsByHabit.get(row.habit_id) || []
        dates.push(row.log_date)
        logsByHabit.set(row.habit_id, dates)
      }

      const habitsByArea = new Map<HabitArea, HabitStatus[]>()
      for (const area of HABIT_AREAS) {
        habitsByArea.set(area, [])
      }

      let followingCount = 0
      let completedTodayCount = 0
      let bestStreak = 0

      for (const definition of definitions) {
        const following = followingMap.get(definition.id) === true
        const status = buildHabitStatus(
          definition,
          following,
          logsByHabit.get(definition.id) || [],
          today
        )

        habitsByArea.get(definition.area)?.push(status)

        if (following) followingCount++
        if (status.completedToday) completedTodayCount++
        if (status.currentStreak > bestStreak) bestStreak = status.currentStreak
      }

      for (const area of HABIT_AREAS) {
        habitsByArea.get(area)?.sort((a, b) => a.sort_order - b.sort_order)
      }

      return res.status(200).json({
        today,
        areas: HABIT_AREAS.map((area) => ({
          area,
          label: HABIT_AREA_LABELS[area],
          habits: habitsByArea.get(area) || [],
        })),
        summary: {
          following: followingCount,
          completedToday: completedTodayCount,
          bestStreak,
        },
      })
    }

    const { habit_id: habitId, action } = req.body as { habit_id?: number; action?: HabitAction }

    if (!habitId || !action || !['follow', 'unfollow', 'complete'].includes(action)) {
      return res.status(400).json({ error: 'habit_id y action son requeridos' })
    }

    const { data: definition, error: definitionError } = await supabase
      .from('habit_definitions')
      .select('id, area, name, description, icon, points_per_completion, sort_order')
      .eq('id', habitId)
      .eq('is_active', true)
      .maybeSingle()

    if (definitionError || !definition) {
      return res.status(404).json({ error: 'Hábito no encontrado' })
    }

    let pointsAwarded = 0

    if (action === 'follow') {
      const { error } = await supabase.from('employee_habits').upsert(
        {
          employee_id: employeeId,
          company_id: companyId,
          habit_id: habitId,
          active: true,
        },
        { onConflict: 'employee_id,habit_id' }
      )
      if (error) {
        logger.error('Failed to follow habit', error)
        return res.status(500).json({ error: 'Error al seguir hábito' })
      }
    } else if (action === 'unfollow') {
      const { error } = await supabase
        .from('employee_habits')
        .update({ active: false })
        .eq('employee_id', employeeId)
        .eq('habit_id', habitId)
      if (error) {
        logger.error('Failed to unfollow habit', error)
        return res.status(500).json({ error: 'Error al dejar de seguir hábito' })
      }
    } else if (action === 'complete') {
      const { data: enrollment } = await supabase
        .from('employee_habits')
        .select('active')
        .eq('employee_id', employeeId)
        .eq('habit_id', habitId)
        .maybeSingle()

      if (!enrollment?.active) {
        const { error: followError } = await supabase.from('employee_habits').upsert(
          {
            employee_id: employeeId,
            company_id: companyId,
            habit_id: habitId,
            active: true,
          },
          { onConflict: 'employee_id,habit_id' }
        )
        if (followError) {
          logger.error('Failed to auto-follow habit on complete', followError)
          return res.status(500).json({ error: 'Error al registrar hábito' })
        }
      }

      const { error: logError } = await supabase.from('habit_logs').insert({
        employee_id: employeeId,
        company_id: companyId,
        habit_id: habitId,
        log_date: today,
      })

      if (logError) {
        if (logError.code === '23505') {
          pointsAwarded = 0
        } else {
          logger.error('Failed to log habit completion', logError)
          return res.status(500).json({ error: 'Error al marcar hábito' })
        }
      } else {
        pointsAwarded = definition.points_per_completion
        await awardHabitPoints(employeeId, companyId, definition.name, pointsAwarded)
      }
    }

    const [enrollmentResult, logsResult] = await Promise.all([
      supabase
        .from('employee_habits')
        .select('active')
        .eq('employee_id', employeeId)
        .eq('habit_id', habitId)
        .maybeSingle(),
      supabase
        .from('habit_logs')
        .select('log_date')
        .eq('employee_id', employeeId)
        .eq('habit_id', habitId)
        .gte('log_date', logsSince),
    ])

    const habitStatus = buildHabitStatus(
      definition as HabitDefinition,
      enrollmentResult.data?.active === true,
      (logsResult.data || []).map((row) => row.log_date),
      today
    )

    if (action === 'complete' && pointsAwarded > 0) {
      await checkAndAwardHabitAchievements(employeeId, companyId, habitStatus.currentStreak)
    }

    return res.status(200).json({ habit: habitStatus, pointsAwarded })
  } catch (error) {
    logger.error('API error in employee habits', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
