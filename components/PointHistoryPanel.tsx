import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

type PointHistoryRow = {
  id: number
  employee_id: string
  company_id: string
  points_earned: number
  reason: string
  action_type: string
  reference_date: string | null
  created_at: string
}

type LeaderboardEntry = {
  employee_id: string
  employee?: { name?: string; employee_code?: string }
}

export default memo(function PointHistoryPanel({
  leaderboard
}: {
  leaderboard: LeaderboardEntry[]
}) {
  const [employeeId, setEmployeeId] = useState<string>('')
  const [rows, setRows] = useState<PointHistoryRow[]>([])
  const [optionsFromApi, setOptionsFromApi] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const employeeOptions = useMemo(() => {
    const source = (leaderboard && leaderboard.length > 0) ? leaderboard : optionsFromApi
    return (source || [])
      .map((e) => ({
        id: e.employee_id,
        label: e.employee?.name
          ? `${e.employee.name}${e.employee?.employee_code ? ` (${e.employee.employee_code})` : ''}`
          : e.employee_id
      }))
      .filter((x) => x.id)
  }, [leaderboard, optionsFromApi])

  const fetchEmployeeOptions = useCallback(async () => {
    if (leaderboard && leaderboard.length > 0) return
    try {
      const res = await fetch('/api/gamification?action=leaderboard&limit=100')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setOptionsFromApi(data.data)
      }
    } catch {
      // non-blocking
    }
  }, [leaderboard])

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams()
      qs.set('action', 'point-history')
      qs.set('limit', '25')
      if (employeeId) qs.set('employee_id', employeeId)
      const res = await fetch(`/api/gamification?${qs.toString()}`)
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to fetch point history')
        return
      }
      setRows(data.data || [])
    } catch {
      setError('Failed to fetch point history')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    fetchEmployeeOptions()
    fetchHistory()
  }, [fetchHistory, fetchEmployeeOptions])

  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Historial de Puntos</CardTitle>
          <CardDescription className="text-gray-300">Cargando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-white">Historial de Puntos</CardTitle>
            <CardDescription className="text-gray-300">
              `point_history` (últimos 25). Filtrable por empleado.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {employeeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={fetchHistory}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 rounded-md text-white text-sm transition-all duration-200"
            >
              Refresh
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-400 mb-3">{error}</div>}

        {rows.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Sin movimientos recientes.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{r.reason}</div>
                    <div className="text-xs text-gray-300">
                      {new Date(r.created_at).toLocaleString()} · {r.action_type}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold text-white">
                      {r.points_earned >= 0 ? `+${r.points_earned}` : r.points_earned} pts
                    </div>
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

