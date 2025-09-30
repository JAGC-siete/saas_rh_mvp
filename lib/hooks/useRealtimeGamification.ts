import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '../supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeGamificationConfig {
  companyId: string
  employeeId?: string
  onScoreUpdate?: (data: ScoreUpdateData) => void
  onAchievementUnlock?: (data: AchievementData) => void
  onLeaderboardUpdate?: (data: LeaderboardData) => void
  onPointHistory?: (data: PointHistoryData) => void
}

export interface ScoreUpdateData {
  employee_id: string
  company_id: string
  total_points: number
  weekly_points: number
  monthly_points: number
  punctuality_streak: number
  updated_at: string
}

export interface AchievementData {
  employee_id: string
  company_id: string
  achievement_type_id: number
  points_earned: number
  earned_at: string
}

export interface LeaderboardData {
  company_id: string
  employee_id: string
  total_points: number
  rank_change: string
  updated_at: string
}

export interface PointHistoryData {
  employee_id: string
  company_id: string
  points_earned: number
  reason: string
  action_type: string
  created_at: string
}

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  retryCount: number
  lastError?: string
}

export function useRealtimeGamification(config: RealtimeGamificationConfig) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0
  })
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClient()
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxRetries = 5

  const connect = useCallback(() => {
    if (!config.companyId) {
      console.warn('useRealtimeGamification: companyId is required')
      return
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    setConnectionState(prev => ({ ...prev, status: 'connecting' }))

    try {
      const channelName = `gamification_${config.companyId}`
      const realtimeChannel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'employee_scores',
          filter: `company_id=eq.${config.companyId}`
        }, (payload) => {
          console.log('🔔 Score update received:', payload)
          config.onScoreUpdate?.(payload.new as ScoreUpdateData)
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_achievements',
          filter: `company_id=eq.${config.companyId}`
        }, (payload) => {
          console.log('🏆 Achievement unlock received:', payload)
          config.onAchievementUnlock?.(payload.new as AchievementData)
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'realtime_leaderboard',
          filter: `company_id=eq.${config.companyId}`
        }, (payload) => {
          console.log('📊 Leaderboard update received:', payload)
          config.onLeaderboardUpdate?.(payload.new as LeaderboardData)
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'point_history',
          filter: `company_id=eq.${config.companyId}`
        }, (payload) => {
          console.log('💰 Point history received:', payload)
          config.onPointHistory?.(payload.new as PointHistoryData)
        })
        .subscribe((status, err) => {
          console.log('🔌 Realtime status:', status, err ? `Error: ${err.message}` : '')
          
          if (status === 'SUBSCRIBED') {
            setConnectionState({
              status: 'connected',
              retryCount: 0
            })
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionState(prev => ({
              status: 'error',
              retryCount: prev.retryCount + 1,
              lastError: err?.message || 'Connection error'
            }))
            
            // Retry with exponential backoff
            if (connectionState.retryCount < maxRetries) {
              const delay = Math.pow(2, connectionState.retryCount) * 1000
              console.log(`🔄 Retrying connection in ${delay}ms (attempt ${connectionState.retryCount + 1}/${maxRetries})`)
              
              retryTimeoutRef.current = setTimeout(() => {
                connect()
              }, delay)
            } else {
              console.error('❌ Max retries reached, giving up')
            }
          } else if (status === 'CLOSED') {
            setConnectionState(prev => ({
              ...prev,
              status: 'disconnected'
            }))
          }
        })

      setChannel(realtimeChannel)
    } catch (error) {
      console.error('❌ Failed to create realtime channel:', error)
      setConnectionState(prev => ({
        status: 'error',
        retryCount: prev.retryCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [config.companyId, supabase, connectionState.retryCount])

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (channel) {
      console.log('🔌 Disconnecting realtime channel')
      supabase.removeChannel(channel)
      setChannel(null)
      setConnectionState({
        status: 'disconnected',
        retryCount: 0
      })
    }
  }, [channel, supabase])

  // Auto-connect on mount and when companyId changes
  useEffect(() => {
    if (config.companyId) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [config.companyId, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'connecting',
    connectionState,
    connect,
    disconnect
  }
}

// Hook for individual employee real-time updates
export function useRealtimeEmployeeUpdates(employeeId: string, companyId: string) {
  const [employeeData, setEmployeeData] = useState<{
    scores?: ScoreUpdateData
    achievements: AchievementData[]
    pointHistory: PointHistoryData[]
  }>({
    achievements: [],
    pointHistory: []
  })

  const { isConnected } = useRealtimeGamification({
    companyId,
    employeeId,
    onScoreUpdate: (data) => {
      if (data.employee_id === employeeId) {
        setEmployeeData(prev => ({ ...prev, scores: data }))
      }
    },
    onAchievementUnlock: (data) => {
      if (data.employee_id === employeeId) {
        setEmployeeData(prev => ({
          ...prev,
          achievements: [...prev.achievements, data]
        }))
      }
    },
    onPointHistory: (data) => {
      if (data.employee_id === employeeId) {
        setEmployeeData(prev => ({
          ...prev,
          pointHistory: [data, ...prev.pointHistory.slice(0, 9)] // Keep last 10
        }))
      }
    }
  })

  return {
    employeeData,
    isConnected
  }
}

// Hook for company-wide real-time updates
export function useRealtimeCompanyUpdates(companyId: string) {
  const [companyData, setCompanyData] = useState<{
    leaderboardUpdates: LeaderboardData[]
    recentAchievements: AchievementData[]
    recentPoints: PointHistoryData[]
  }>({
    leaderboardUpdates: [],
    recentAchievements: [],
    recentPoints: []
  })

  const { isConnected } = useRealtimeGamification({
    companyId,
    onLeaderboardUpdate: (data) => {
      setCompanyData(prev => ({
        ...prev,
        leaderboardUpdates: [data, ...prev.leaderboardUpdates.slice(0, 19)] // Keep last 20
      }))
    },
    onAchievementUnlock: (data) => {
      setCompanyData(prev => ({
        ...prev,
        recentAchievements: [data, ...prev.recentAchievements.slice(0, 9)] // Keep last 10
      }))
    },
    onPointHistory: (data) => {
      setCompanyData(prev => ({
        ...prev,
        recentPoints: [data, ...prev.recentPoints.slice(0, 19)] // Keep last 20
      }))
    }
  })

  return {
    companyData,
    isConnected
  }
}
