import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '../supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

// Singleton channel registry by companyId to avoid duplicate subscriptions
const channelRegistry: Map<string, { channel: RealtimeChannel; refCount: number }> = new Map()

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

  const establishChannel = useCallback((): RealtimeChannel => {
    const channelName = `gamification_${config.companyId}`

    // Create new channel with listeners
    const newChannel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'employee_scores',
        filter: `company_id=eq.${config.companyId}`
      }, (payload) => {
        config.onScoreUpdate?.(payload.new as ScoreUpdateData)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'employee_achievements',
        filter: `company_id=eq.${config.companyId}`
      }, (payload) => {
        config.onAchievementUnlock?.(payload.new as AchievementData)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'point_history',
        filter: `company_id=eq.${config.companyId}`
      }, (payload) => {
        config.onPointHistory?.(payload.new as PointHistoryData)
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState({ status: 'connected', retryCount: 0 })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionState(prev => ({
            status: 'error',
            retryCount: prev.retryCount + 1,
            lastError: err?.message || 'Connection error'
          }))

          if (connectionState.retryCount < maxRetries) {
            const delay = Math.pow(2, connectionState.retryCount) * 1000
            retryTimeoutRef.current = setTimeout(() => {
              // Re-subscribe by re-establishing the channel
              try {
                supabase.removeChannel(newChannel)
              } catch {}
              const reChannel = establishChannel()
              setChannel(reChannel)
            }, delay)
          }
        } else if (status === 'CLOSED') {
          setConnectionState(prev => ({ ...prev, status: 'disconnected' }))
        }
      })

    return newChannel
  }, [config.companyId, config.onScoreUpdate, config.onAchievementUnlock, config.onPointHistory, supabase, connectionState.retryCount])

  const connect = useCallback(() => {
    if (!config.companyId) {
      console.warn('useRealtimeGamification: companyId is required')
      return
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    setConnectionState(prev => ({ ...prev, status: 'connecting' }))

    try {
      const existing = channelRegistry.get(config.companyId)
      if (existing) {
        // Reuse existing channel
        channelRegistry.set(config.companyId, { channel: existing.channel, refCount: existing.refCount + 1 })
        setChannel(existing.channel)
        setConnectionState({ status: 'connected', retryCount: 0 })
        return
      }

      // Create and register a new shared channel
      const newChannel = establishChannel()
      channelRegistry.set(config.companyId, { channel: newChannel, refCount: 1 })
      setChannel(newChannel)
    } catch (error) {
      setConnectionState(prev => ({
        status: 'error',
        retryCount: prev.retryCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [config.companyId, establishChannel])

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (!config.companyId) return

    const reg = channelRegistry.get(config.companyId)
    if (reg) {
      const newCount = reg.refCount - 1
      if (newCount <= 0) {
        try {
          // Remove and clean up the shared channel
          supabase.removeChannel(reg.channel)
        } catch {}
        channelRegistry.delete(config.companyId)
      } else {
        channelRegistry.set(config.companyId, { channel: reg.channel, refCount: newCount })
      }
    }

    setChannel(null)
    setConnectionState({ status: 'disconnected', retryCount: 0 })
  }, [config.companyId, supabase])

  useEffect(() => {
    if (config.companyId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [config.companyId, connect, disconnect])

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
          pointHistory: [data, ...prev.pointHistory.slice(0, 9)]
        }))
      }
    }
  })

  return {
    employeeData,
    isConnected
  }
}

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
    onAchievementUnlock: (data) => {
      setCompanyData(prev => ({
        ...prev,
        recentAchievements: [data, ...prev.recentAchievements.slice(0, 9)]
      }))
    },
    onPointHistory: (data) => {
      setCompanyData(prev => ({
        ...prev,
        recentPoints: [data, ...prev.recentPoints.slice(0, 19)]
      }))
    }
  })

  return {
    companyData,
    isConnected
  }
}
