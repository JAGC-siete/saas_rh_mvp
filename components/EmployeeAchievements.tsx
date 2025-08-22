import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface Achievement {
  id: number
  employee_id: string
  achievement_type_id: number
  points_earned: number
  earned_at: string
  achievement_type: {
    name: string
    description: string
    icon: string
    points_reward: number
    badge_color: string
  }
}

interface EmployeeAchievementsProps {
  companyId: string
  employeeId?: string
  limit?: number
}

export default function EmployeeAchievements({ companyId, employeeId, limit = 10 }: EmployeeAchievementsProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      let url = `/api/gamification?action=achievements&company_id=${companyId}&limit=${limit}`
      if (employeeId) {
        url += `&employee_id=${employeeId}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setAchievements(data.data)
      } else {
        setError(data.error || 'Failed to fetch achievements')
      }
    } catch (err) {
      setError('Failed to fetch achievements data')
      console.error('Achievements fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, employeeId, limit])

  useEffect(() => {
    if (!companyId) return
    fetchAchievements()
  }, [companyId, employeeId, fetchAchievements])

  const getBadgeColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'gold': 'bg-yellow-500/20 border border-yellow-400/30 hover:bg-yellow-500/30',
      'blue': 'bg-blue-500/20 border border-blue-400/30 hover:bg-blue-500/30',
      'purple': 'bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30',
      'diamond': 'bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30',
      'green': 'bg-green-500/20 border border-green-400/30 hover:bg-green-500/30',
      'orange': 'bg-orange-500/20 border border-orange-400/30 hover:bg-orange-500/30',
      'red': 'bg-red-500/20 border border-red-400/30 hover:bg-red-500/30'
    }
    return colorMap[color] || 'bg-white/5 border border-white/20 hover:bg-white/10'
  }

  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Employee Achievements</CardTitle>
          <CardDescription className="text-gray-300">Loading achievements...</CardDescription>
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
          <CardTitle className="text-white">Employee Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchAchievements}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 rounded-md text-white transition-all duration-200"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (achievements.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Employee Achievements</CardTitle>
          <CardDescription className="text-gray-300">No achievements earned yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <p>Keep up the good work to earn achievements!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-white">Employee Achievements</CardTitle>
        <CardDescription className="text-gray-300">
          {employeeId ? 'Individual achievements' : 'Company achievements'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg text-white ${getBadgeColor(achievement.achievement_type.badge_color)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {achievement.achievement_type.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      {achievement.achievement_type.name}
                    </h4>
                    <p className="text-sm opacity-90">
                      {achievement.achievement_type.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    +{achievement.points_earned} pts
                  </div>
                  <div className="text-xs opacity-75">
                    {new Date(achievement.earned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {achievements.length > 0 && (
          <div className="mt-6 text-center">
            <button 
              onClick={fetchAchievements}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 rounded-md text-white text-sm transition-all duration-200"
            >
              Refresh Achievements
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
