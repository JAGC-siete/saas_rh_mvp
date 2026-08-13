import { useCallback, useEffect, useState } from 'react'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { useNotificationContext } from '../NotificationProvider'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import type { HabitArea, HabitStatus, WeekProgressDay } from '../../lib/habits/service'

interface HabitsArea {
  area: HabitArea
  label: string
  habits: HabitStatus[]
}

interface HabitsResponse {
  today: string
  areas: HabitsArea[]
  summary: {
    following: number
    completedToday: number
    bestStreak: number
  }
}

const AREA_STYLES: Record<
  HabitArea,
  { border: string; badge: string; dot: string; dotActive: string; section: string }
> = {
  emotional: {
    border: 'border-pink-500/30',
    badge: 'bg-pink-500/20 text-pink-300',
    dot: 'bg-pink-500/20',
    dotActive: 'bg-pink-400',
    section: 'text-pink-300',
  },
  finance: {
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300',
    dot: 'bg-emerald-500/20',
    dotActive: 'bg-emerald-400',
    section: 'text-emerald-300',
  },
  learning: {
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300',
    dot: 'bg-blue-500/20',
    dotActive: 'bg-blue-400',
    section: 'text-blue-300',
  },
  nutrition: {
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300',
    dot: 'bg-amber-500/20',
    dotActive: 'bg-amber-400',
    section: 'text-amber-300',
  },
}

function WeekDots({
  progress,
  today,
  styles,
}: {
  progress: WeekProgressDay[]
  today: string
  styles: (typeof AREA_STYLES)[HabitArea]
}) {
  return (
    <div className="flex items-center gap-1.5" title="Progreso de los últimos 7 días">
      {progress.map((day) => {
        const isToday = day.date === today
        return (
          <span
            key={day.date}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              day.done ? styles.dotActive : styles.dot
            } ${isToday ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-transparent' : ''}`}
          />
        )
      })}
    </div>
  )
}

export default function HabitTracker() {
  const { addNotification } = useNotificationContext()
  const [data, setData] = useState<HabitsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionHabitId, setActionHabitId] = useState<number | null>(null)

  const fetchHabits = useCallback(async () => {
    try {
      setError('')
      const response = await fetch('/api/employees/me/habits', { credentials: 'include' })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Error al cargar hábitos')
      }
      const payload = (await response.json()) as HabitsResponse
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchHabits()
  }, [fetchHabits])

  const updateHabitInState = (updated: HabitStatus) => {
    setData((prev) => {
      if (!prev) return prev

      let following = 0
      let completedToday = 0
      let bestStreak = 0

      const areas = prev.areas.map((area) => ({
        ...area,
        habits: area.habits.map((habit) => {
          const next = habit.id === updated.id ? updated : habit
          if (next.following) following++
          if (next.completedToday) completedToday++
          if (next.currentStreak > bestStreak) bestStreak = next.currentStreak
          return next
        }),
      }))

      return {
        ...prev,
        areas,
        summary: { following, completedToday, bestStreak },
      }
    })
  }

  const runAction = async (habitId: number, action: 'follow' | 'unfollow' | 'complete') => {
    setActionHabitId(habitId)
    try {
      const response = await fetch('/api/employees/me/habits', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, action }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo completar la acción')
      }

      const { habit, pointsAwarded } = payload as { habit: HabitStatus; pointsAwarded: number }
      updateHabitInState(habit)

      if (action === 'complete' && pointsAwarded > 0) {
        addNotification({
          type: 'success',
          title: '¡Hábito completado!',
          message: `+${pointsAwarded} puntos · Racha: ${habit.currentStreak} días`,
          module: 'gamification',
        })
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Inténtalo nuevamente',
        module: 'gamification',
      })
    } finally {
      setActionHabitId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto" />
        <p className="text-gray-400 mt-3 text-sm">Cargando hábitos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="outline" onClick={() => void fetchHabits()}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="liquid" className="border border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400">Mis hábitos</p>
            <p className="text-3xl font-bold text-white mt-1">{data.summary.following}</p>
          </CardContent>
        </Card>
        <Card variant="liquid" className="border border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400">Completados hoy</p>
            <p className="text-3xl font-bold text-green-400 mt-1">{data.summary.completedToday}</p>
          </CardContent>
        </Card>
        <Card variant="liquid" className="border border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400">Mejor racha</p>
            <p className="text-3xl font-bold text-orange-400 mt-1">
              {data.summary.bestStreak > 0 ? `🔥 ${data.summary.bestStreak}` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.areas.map((area) => {
        const styles = AREA_STYLES[area.area]
        return (
          <section key={area.area} className="space-y-3">
            <h3 className={`text-lg font-semibold ${styles.section}`}>{area.label}</h3>
            <div className="space-y-3">
              {area.habits.map((habit) => {
                const busy = actionHabitId === habit.id
                return (
                  <div
                    key={habit.id}
                    className={`rounded-xl border bg-white/5 p-4 ${styles.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0" aria-hidden>
                        {habit.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-white font-medium">{habit.name}</p>
                            {habit.description && (
                              <p className="text-sm text-gray-400 mt-0.5">{habit.description}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void runAction(habit.id, habit.following ? 'unfollow' : 'follow')
                            }
                            className="shrink-0 p-1 rounded-md hover:bg-white/10 disabled:opacity-50 transition-colors"
                            title={habit.following ? 'Dejar de seguir' : 'Seguir hábito'}
                            aria-label={habit.following ? 'Dejar de seguir' : 'Seguir hábito'}
                          >
                            {habit.following ? (
                              <StarSolid className="h-5 w-5 text-amber-400" />
                            ) : (
                              <StarOutline className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <WeekDots progress={habit.weekProgress} today={data.today} styles={styles} />
                          {habit.currentStreak > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                              🔥 {habit.currentStreak}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            +{habit.points_per_completion} pts
                          </span>
                        </div>

                        <div className="mt-3">
                          <Button
                            size="sm"
                            disabled={habit.completedToday || busy}
                            onClick={() => void runAction(habit.id, 'complete')}
                            className={
                              habit.completedToday
                                ? 'bg-green-600/30 text-green-300 cursor-default'
                                : 'bg-brand-600 hover:bg-brand-500 text-white'
                            }
                          >
                            {habit.completedToday ? 'Completado hoy' : 'Marcar como hecho'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
