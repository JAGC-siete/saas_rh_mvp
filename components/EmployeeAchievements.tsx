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
      'gold': 'bg-gradient-to-r from-yellow-400 to-yellow-600',
      'blue': 'bg-gradient-to-r from-blue-400 to-blue-600',
      'purple': 'bg-gradient-to-r from-purple-400 to-purple-600',
      'diamond': 'bg-gradient-to-r from-cyan-400 to-cyan-600',
      'green': 'bg-gradient-to-r from-green-400 to-green-600',
      'orange': 'bg-gradient-to-r from-orange-400 to-orange-600',
      'red': 'bg-gradient-to-r from-red-400 to-red-600'
    }
    return colorMap[color] || 'bg-gray-600'
  }

  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">🏆 Employee Achievements</CardTitle>
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
          <CardTitle className="text-white">🏆 Employee Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchAchievements}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
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
          <CardTitle className="text-white">🏆 Employee Achievements</CardTitle>
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
        <CardTitle className="text-white">🏆 Employee Achievements</CardTitle>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm"
            >
              Refresh Achievements
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
