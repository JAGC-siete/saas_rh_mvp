import React, { useState, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { TrophyIcon, StarIcon } from '@heroicons/react/24/solid'
import { AcademicCapIcon } from '@heroicons/react/24/outline'
import { useCompanyContext } from '../lib/useCompanyContext'
import { useRealtimeGamification, LeaderboardData, ScoreUpdateData } from '../lib/hooks/useRealtimeGamification'

interface LeaderboardEntry {
  id: number
  employee_id: string
  total_points: number
  weekly_points: number
  monthly_points: number
  punctuality_streak: number
  rank: number
  employee: {
    name: string
    employee_code: string
    department?: {
      name: string
    }
  }
}

interface RealtimeGamificationLeaderboardProps {
  companyId?: string
  limit?: number
}

export default memo(function RealtimeGamificationLeaderboard({ 
  companyId: propCompanyId, 
  limit = 20 
}: RealtimeGamificationLeaderboardProps) {
  const { companyId: contextCompanyId, loading: companyLoading } = useCompanyContext()
  const companyId = propCompanyId || contextCompanyId
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedEntries, setUpdatedEntries] = useState<Set<string>>(new Set())

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <TrophyIcon className="h-6 w-6 text-yellow-500" />
    if (rank === 2) return <AcademicCapIcon className="h-6 w-6 text-gray-400" />
    if (rank === 3) return <StarIcon className="h-6 w-6 text-orange-500" />
    return <span className="text-lg font-bold text-gray-400">{rank}</span>
  }

  const getRankColor = (rank: number, isUpdated: boolean = false) => {
    if (isUpdated) {
      return 'bg-green-500/20 border border-green-400/30 hover:bg-green-500/30 animate-pulse'
    }
    
    if (rank === 1) return 'bg-yellow-500/20 border border-yellow-400/30 hover:bg-yellow-500/30'
    if (rank === 2) return 'bg-gray-400/20 border border-gray-300/30 hover:bg-gray-400/30'
    if (rank === 3) return 'bg-orange-500/20 border border-orange-400/30 hover:bg-orange-500/30'
    return 'bg-white/5 border border-white/20 hover:bg-white/10'
  }

  const fetchLeaderboard = useCallback(async () => {
    if (!companyId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/gamification?action=leaderboard&limit=${limit}`)
      const data = await response.json()
      
      if (data.success) {
        setLeaderboard(data.data)
      } else {
        setError(data.error || 'Failed to fetch leaderboard')
      }
    } catch (err) {
      setError('Failed to fetch leaderboard data')
      console.error('Leaderboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, limit])

  const updateLeaderboardEntry = useCallback((scoreData: ScoreUpdateData) => {
    console.log('📊 Updating leaderboard entry:', scoreData)
    
    setLeaderboard(prev => {
      const updated = prev.map(entry => 
        entry.employee_id === scoreData.employee_id
          ? { 
              ...entry, 
              total_points: scoreData.total_points,
              weekly_points: scoreData.weekly_points,
              monthly_points: scoreData.monthly_points,
              punctuality_streak: scoreData.punctuality_streak
            }
          : entry
      )
      
      // Re-sort by total points
      const sorted = updated.sort((a, b) => b.total_points - a.total_points)
      
      // Update ranks
      return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }))
    })

    // Mark as updated for animation
    setUpdatedEntries(prev => new Set([...prev, scoreData.employee_id]))
    
    // Clear update flag after animation
    setTimeout(() => {
      setUpdatedEntries(prev => {
        const newSet = new Set(prev)
        newSet.delete(scoreData.employee_id)
        return newSet
      })
    }, 2000)
  }, [])

  const handleLeaderboardUpdate = useCallback((data: LeaderboardData) => {
    console.log('📊 Leaderboard update received:', data)
    // Refresh entire leaderboard for major changes
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const handleScoreUpdate = useCallback((data: ScoreUpdateData) => {
    console.log('💰 Score update received:', data)
    updateLeaderboardEntry(data)
  }, [updateLeaderboardEntry])

  // Real-time connection
  const { isConnected, isConnecting, connectionState } = useRealtimeGamification({
    companyId: companyId!,
    onLeaderboardUpdate: handleLeaderboardUpdate,
    onScoreUpdate: handleScoreUpdate
  })

  useEffect(() => {
    if (!companyId) return
    fetchLeaderboard()
  }, [companyId, fetchLeaderboard])

  const getConnectionStatus = () => {
    if (isConnecting) return 'Conectando...'
    if (isConnected) return 'Conectado en tiempo real'
    if (connectionState.status === 'error') return `Error: ${connectionState.lastError}`
    return 'Desconectado'
  }

  const getConnectionColor = () => {
    if (isConnected) return 'text-green-400'
    if (isConnecting) return 'text-yellow-400'
    if (connectionState.status === 'error') return 'text-red-400'
    return 'text-gray-400'
  }

  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrophyIcon className="h-6 w-6 text-yellow-500" />
            Employee Leaderboard
          </CardTitle>
          <CardDescription className="text-gray-300">Loading employee rankings...</CardDescription>
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
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrophyIcon className="h-6 w-6 text-yellow-500" />
            Employee Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 rounded-md text-white transition-all duration-200"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrophyIcon className="h-6 w-6 text-yellow-500" />
            Employee Leaderboard
          </CardTitle>
          <CardDescription className="text-gray-300">No employees have earned points yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <p>Start tracking attendance to see the leaderboard!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrophyIcon className="h-6 w-6 text-yellow-500" />
          Employee Leaderboard
          {isConnected && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" 
                 title="Conectado en tiempo real" />
          )}
        </CardTitle>
        <CardDescription className="text-gray-300">
          Top performers this month
          <span className={`ml-2 text-xs ${getConnectionColor()}`}>
            • {getConnectionStatus()}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => {
            const isUpdated = updatedEntries.has(entry.employee_id)
            
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 ${
                  getRankColor(entry.rank, isUpdated)
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      {entry.employee.name || `Employee ${entry.employee.employee_code}`}
                    </h4>
                    <p className="text-sm text-gray-300">
                      {entry.employee.department?.name || 'No Department'} • {entry.employee.employee_code}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {entry.total_points.toLocaleString()} pts
                  </div>
                  <div className="text-sm text-gray-300">
                    {entry.weekly_points} this week
                  </div>
                  {entry.punctuality_streak > 0 && (
                    <div className="text-xs text-green-400">
                      {entry.punctuality_streak} day streak
                    </div>
                  )}
                  {isUpdated && (
                    <div className="text-xs text-green-400 font-bold">
                      ¡ACTUALIZADO!
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {leaderboard.length > 0 && (
          <div className="mt-6 text-center">
            <button 
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 rounded-md text-white text-sm transition-all duration-200"
            >
              Refresh Leaderboard
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
