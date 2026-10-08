import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardOverview } from '../../lib/dashboard/overview'

export function useDashboardOverview(enabled = true) {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/overview', { credentials: 'include', signal: controller.signal })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Error ${res.status}`)
      }
      setData((await res.json()) as DashboardOverview)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard')
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    load()
    return () => controllerRef.current?.abort()
  }, [enabled, load])

  return { data, error, loading, reload: load }
}
