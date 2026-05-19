import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import {
  resolveSettingsAccessFromProfile,
  type SettingsAccessContext,
} from '../security/settings-access'

const DENY: SettingsAccessContext = {
  canViewFullSettings: false,
  canManageSettings: false,
  canAccessSchedulesCreateOnly: false,
  canCreateWorkSchedules: false,
  canManageWorkSchedules: false,
  showSettingsNav: false,
}

export function useSettingsAccess(): SettingsAccessContext & { loading: boolean } {
  const { userProfile } = useAuth()
  const [access, setAccess] = useState<SettingsAccessContext>(DENY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userProfile?.id) {
      setAccess(DENY)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch('/api/me/settings-access', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('settings-access fetch failed')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const s = data?.settings_access
        if (s && typeof s.showSettingsNav === 'boolean') {
          setAccess({
            canViewFullSettings: !!s.canViewFullSettings,
            canManageSettings: !!s.canManageSettings,
            canAccessSchedulesCreateOnly: !!s.canAccessSchedulesCreateOnly,
            canCreateWorkSchedules: !!s.canCreateWorkSchedules,
            canManageWorkSchedules: !!s.canManageWorkSchedules,
            showSettingsNav: !!s.showSettingsNav,
          })
        } else {
          setAccess(resolveSettingsAccessFromProfile(userProfile))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccess(resolveSettingsAccessFromProfile(userProfile))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userProfile?.id, userProfile?.role, userProfile?.permissions])

  return { ...access, loading }
}
