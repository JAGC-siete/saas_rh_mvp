import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { TrophyIcon, StarIcon } from '@heroicons/react/24/solid'
import { AcademicCapIcon } from '@heroicons/react/24/outline'

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

interface GamificationLeaderboardProps {
  companyId: string
  limit?: number
}

export default function GamificationLeaderboard({ companyId, limit = 20 }: GamificationLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/gamification?action=leaderboard&company_id=${companyId}&limit=${limit}`)
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

  useEffect(() => {
    if (!companyId) return
    fetchLeaderboard()
  }, [companyId, fetchLeaderboard])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <TrophyIcon className="h-6 w-6 text-yellow-500" />
    if (rank === 2) return <AcademicCapIcon className="h-6 w-6 text-gray-400" />
    if (rank === 3) return <StarIcon className="h-6 w-6 text-orange-500" />
    return <span className="text-lg font-bold text-gray-400">{rank}</span>
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500'
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600'
    return 'bg-gray-700 hover:bg-gray-600'
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
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
        </CardTitle>
        <CardDescription className="text-gray-300">Top performers this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${getRankColor(entry.rank)}`}
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
                  {entry.total_points} pts
                </div>
                <div className="text-sm text-gray-300">
                  {entry.weekly_points} this week
                </div>
                {entry.punctuality_streak > 0 && (
                  <div className="text-xs text-green-400">
                    🔥 {entry.punctuality_streak} day streak
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {leaderboard.length > 0 && (
          <div className="mt-6 text-center">
            <button 
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm"
            >
              Refresh Leaderboard
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
