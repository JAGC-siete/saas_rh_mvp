/**
 * Componente para gestionar sesiones activas del usuario
 * Permite ver todas las sesiones y revocar sesiones remotas
 */

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '../lib/auth'
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface Session {
  id: string
  session_token?: string
  device_id: string | null
  ip_hash: string | null
  ua_hash: string | null
  created_at: string
  last_activity: string
  expires_at: string
  idle_timeout_at: string
  metadata: Record<string, any>
  is_current?: boolean
}

interface SessionManagerProps {
  onClose?: () => void
  show?: boolean
}

export function SessionManager({ onClose, show = true }: SessionManagerProps) {
  const t = useTranslations('session')
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    if (show && user) {
      fetchSessions()
    }
  }, [show, user])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/sessions')
      
      if (!response.ok) {
        throw new Error('Error al obtener sesiones')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId)
      const response = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionId })
      })

      if (!response.ok) {
        throw new Error('Error al revocar sesión')
      }

      // Actualizar lista de sesiones
      await fetchSessions()
    } catch (error) {
      console.error('Error revoking session:', error)
      alert(t('revokeError'))
    } finally {
      setRevoking(null)
    }
  }

  const revokeAllSessions = async () => {
    if (!confirm(t('confirmCloseAll'))) {
      return
    }

    try {
      setRevoking('all')
      const response = await fetch('/api/auth/sessions/revoke-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Error al revocar sesiones')
      }

      await fetchSessions()
    } catch (error) {
      console.error('Error revoking all sessions:', error)
      alert(t('revokeAllError'))
    } finally {
      setRevoking(null)
    }
  }

  const getDeviceIcon = (deviceId: string | null, uaHash: string | null) => {
    if (!deviceId && !uaHash) return <GlobeAltIcon className="h-5 w-5" />
    
    const device = deviceId?.toLowerCase() || ''
    const ua = uaHash?.toLowerCase() || ''
    
    if (device.includes('mobile') || ua.includes('mobile')) {
      return <DevicePhoneMobileIcon className="h-5 w-5" />
    }
    return <ComputerDesktopIcon className="h-5 w-5" />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t('minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    return t('daysAgo', { count: diffDays })
  }

  const getMinutesUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const now = new Date()
    const diffMs = expiry.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    return Math.max(0, diffMins)
  }

  if (!show) return null

  const otherSessions = sessions.filter(s => !s.is_current)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('activeSessions')}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <>
          {/* Sesión actual */}
          {sessions.find(s => s.is_current) && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('current')}</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getDeviceIcon(
                        sessions.find(s => s.is_current)?.device_id || null,
                        sessions.find(s => s.is_current)?.ua_hash || null
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {t('thisDevice')}
                        </p>
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('lastActivity', { when: formatDate(sessions.find(s => s.is_current)?.last_activity || '') })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('expiresIn', { minutes: getMinutesUntilExpiry(sessions.find(s => s.is_current)?.idle_timeout_at || '') })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Otras sesiones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                {t('others', { count: otherSessions.length })}
              </h3>
              {otherSessions.length > 0 && (
                <button
                  onClick={revokeAllSessions}
                  disabled={revoking === 'all'}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {revoking === 'all' ? t('closing') : t('closeAll')}
                </button>
              )}
            </div>

            {otherSessions.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                {t('noOthers')}
              </p>
            ) : (
              <div className="space-y-3">
                {otherSessions.map((session) => (
                  <div
                    key={session.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-0.5 text-gray-400">
                          {getDeviceIcon(session.device_id, session.ua_hash)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {session.device_id || t('unknownDevice')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('lastActivity', { when: formatDate(session.last_activity) })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('created', { when: formatDate(session.created_at) })}
                          </p>
                          {session.metadata?.location && (
                            <p className="text-xs text-gray-500">
                              {t('location', { location: session.metadata.location })}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => revokeSession(session.session_token || session.id)}
                        disabled={revoking === session.id}
                        className="ml-4 text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {revoking === session.id ? t('closing') : t('close')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
