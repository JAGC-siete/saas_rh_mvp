import React, { useState, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useCompanyContext } from '../lib/useCompanyContext'
import { useRealtimeGamification, AchievementData } from '../lib/hooks/useRealtimeGamification'
import { useToast } from '../lib/toast'

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

interface RealtimeEmployeeAchievementsProps {
  companyId?: string
  employeeId?: string
  limit?: number
}

export default memo(function RealtimeEmployeeAchievements({ 
  companyId: propCompanyId, 
  employeeId, 
  limit = 10 
}: RealtimeEmployeeAchievementsProps) {
  const { companyId: contextCompanyId, loading: companyLoading } = useCompanyContext()
  const companyId = propCompanyId || contextCompanyId
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newAchievements, setNewAchievements] = useState<AchievementData[]>([])
  const toast = useToast()

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

  const fetchAchievements = useCallback(async () => {
    if (!companyId) return

    try {
      setLoading(true)
      setError(null)
      
      let url = `/api/gamification?action=achievements&limit=${limit}`
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

  const handleAchievementUnlock = useCallback(async (data: AchievementData) => {
    console.log('🏆 New achievement unlocked:', data)
    
    // Show notification
    toast.success(
      '¡Nuevo Logro Desbloqueado!',
      `Has ganado ${data.points_earned} puntos`,
      5000
    )

    // Add to new achievements list for animation
    setNewAchievements(prev => [data, ...prev.slice(0, 4)]) // Keep last 5

    // Refresh achievements list
    await fetchAchievements()
  }, [toast, fetchAchievements])

  // Real-time connection
  const { isConnected, isConnecting, connectionState } = useRealtimeGamification({
    companyId: companyId!,
    employeeId,
    onAchievementUnlock: handleAchievementUnlock
  })

  useEffect(() => {
    if (!companyId) return
    fetchAchievements()
  }, [companyId, fetchAchievements])

  // Clear new achievements after animation
  useEffect(() => {
    if (newAchievements.length > 0) {
      const timer = setTimeout(() => {
        setNewAchievements([])
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [newAchievements])

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
      <Card variant="liquid">
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
      <Card variant="liquid">
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

  return (
    <Card variant="liquid">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          Employee Achievements
          {isConnected && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" 
                 title="Conectado en tiempo real" />
          )}
        </CardTitle>
        <CardDescription className="text-gray-300">
          {employeeId ? 'Individual achievements' : 'Company achievements'}
          <span className={`ml-2 text-xs ${getConnectionColor()}`}>
            • {getConnectionStatus()}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* New achievements notification */}
        {newAchievements.length > 0 && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-lg">🎉</span>
              <span className="text-sm font-medium">
                {newAchievements.length} nuevo(s) logro(s) desbloqueado(s)!
              </span>
            </div>
          </div>
        )}

        {achievements.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Keep up the good work to earn achievements!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => {
              const isNew = newAchievements.some(na => 
                na.employee_id === achievement.employee_id && 
                na.achievement_type_id === achievement.achievement_type_id
              )
              
              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg text-white transition-all duration-300 ${
                    isNew 
                      ? 'bg-green-500/30 border border-green-400/50 animate-pulse' 
                      : getBadgeColor(achievement.achievement_type.badge_color)
                  }`}
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
                      {isNew && (
                        <div className="text-xs text-green-400 font-bold">
                          ¡NUEVO!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
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
})
