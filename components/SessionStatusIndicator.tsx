/**
 * Componente de indicador de estado de sesión activa
 * Muestra información breve sobre la sesión actual y acceso a gestión de sesiones
 */

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSessionExpiryMonitor } from './SessionExpiryWarning'
import { SessionManager } from './SessionManager'
import { 
  SignalIcon, 
  ClockIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

interface SessionStatusIndicatorProps {
  className?: string
}

export function SessionStatusIndicator({ className = '' }: SessionStatusIndicatorProps) {
  const t = useTranslations('session')
  const { minutesUntilExpiry } = useSessionExpiryMonitor()
  const [showSessionManager, setShowSessionManager] = useState(false)

  const getStatusColor = () => {
    if (!minutesUntilExpiry) return 'text-gray-400'
    if (minutesUntilExpiry <= 10) return 'text-red-400'
    if (minutesUntilExpiry <= 20) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getStatusText = () => {
    if (!minutesUntilExpiry) return t('statusActive')
    if (minutesUntilExpiry <= 1) return t('statusExpiring')
    return `${minutesUntilExpiry}m`
  }

  return (
    <>
      <button
        onClick={() => setShowSessionManager(true)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors ${className}`}
        title={t('viewSessions')}
      >
        <SignalIcon className={`h-4 w-4 ${getStatusColor()}`} />
        <span className="text-xs text-gray-300">
          {getStatusText()}
        </span>
      </button>

      {showSessionManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="relative">
            <SessionManager 
              show={showSessionManager}
              onClose={() => setShowSessionManager(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
