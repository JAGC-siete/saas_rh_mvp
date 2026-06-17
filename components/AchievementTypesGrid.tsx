import React, { memo, useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

type AchievementTypeRow = {
  id: number
  name: string
  description: string | null
  icon: string | null
  points_reward: number | null
  badge_color: string | null
}

export default memo(function AchievementTypesGrid() {
  const [types, setTypes] = useState<AchievementTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/gamification?action=achievement-types&limit=100')
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to fetch achievement types')
        return
      }
      setTypes(data.data || [])
    } catch (e) {
      setError('Failed to fetch achievement types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  const badgeClass = (color?: string | null) => {
    const c = (color || '').toLowerCase()
    const map: Record<string, string> = {
      gold: 'bg-yellow-500/20 border border-yellow-400/30 hover:bg-yellow-500/30',
      blue: 'bg-blue-500/20 border border-blue-400/30 hover:bg-blue-500/30',
      purple: 'bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30',
      diamond: 'bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30',
      green: 'bg-green-500/20 border border-green-400/30 hover:bg-green-500/30',
      orange: 'bg-orange-500/20 border border-orange-400/30 hover:bg-orange-500/30',
      red: 'bg-red-500/20 border border-red-400/30 hover:bg-red-500/30'
    }
    return map[c] || 'bg-white/5 border border-white/20 hover:bg-white/10'
  }

  if (loading) {
    return (
      <Card variant="liquid">
        <CardHeader>
          <CardTitle className="text-white">Tipos de Logros</CardTitle>
          <CardDescription className="text-gray-300">Cargando configuración...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="liquid">
        <CardHeader>
          <CardTitle className="text-white">Tipos de Logros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchTypes}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 rounded-md text-white transition-all duration-200"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="liquid">
      <CardHeader>
        <CardTitle className="text-white">Tipos de Logros Disponibles</CardTitle>
        <CardDescription className="text-gray-300">Leídos desde `achievement_types`</CardDescription>
      </CardHeader>
      <CardContent>
        {types.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No hay logros configurados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {types.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-lg text-white transition-all duration-200 ${badgeClass(t.badge_color)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-2xl mb-2">{t.icon || '🏆'}</div>
                    <h4 className="font-semibold truncate">{t.name}</h4>
                    <p className="text-sm opacity-90">{t.description || ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold">+{t.points_reward || 0} pts</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

