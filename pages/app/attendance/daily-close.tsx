import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'

/**
 * Enlaces antiguos a /app/attendance/daily-close → misma UX en el dashboard con ?panel=close
 */
export default function AttendanceDailyCloseRedirectPage() {
  const router = useRouter()
  const redirected = useRef(false)

  useEffect(() => {
    if (!router.isReady || redirected.current) return
    redirected.current = true
    const q = router.query
    const nextQuery: Record<string, string> = { panel: 'close' }
    for (const key of Object.keys(q)) {
      if (key === 'panel') continue
      const v = q[key]
      if (typeof v === 'string' && v) nextQuery[key] = v
      else if (Array.isArray(v) && v[0]) nextQuery[key] = v[0]
    }
    void router.replace({ pathname: '/app/attendance/dashboard', query: nextQuery })
  }, [router.isReady, router.query, router])

  return (
    <ProtectedRoute>
      <div className="min-h-[40vh] flex items-center justify-center text-gray-400 text-sm">
        Redirigiendo al cierre del día…
      </div>
    </ProtectedRoute>
  )
}
