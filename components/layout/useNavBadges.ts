import { useEffect, useState } from 'react'
import { badgesFromPending } from '../../lib/navigation/sidebar'

const TTL_MS = 5 * 60 * 1000
const STORAGE_KEY = 'sisu.nav.badges'

let memory: { at: number; userId: string; badges: Record<string, number> } | null = null

function readStored(userId: string) {
  if (memory && memory.userId === userId && Date.now() - memory.at < TTL_MS) return memory.badges
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed?.userId === userId && Date.now() - parsed.at < TTL_MS) {
      memory = parsed
      return parsed.badges as Record<string, number>
    }
  } catch {
    // sessionStorage no disponible: se vuelve a pedir.
  }
  return null
}

/** Contadores de pendientes por ítem del menú (fuente: /api/dashboard/overview, cacheado 5 min). */
export function useNavBadges(userId: string | undefined, enabled: boolean) {
  const [badges, setBadges] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!userId || !enabled) return
    const stored = readStored(userId)
    if (stored) {
      setBadges(stored)
      return
    }
    const controller = new AbortController()
    fetch('/api/dashboard/overview', { credentials: 'include', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const next = badgesFromPending(data.pending ?? [])
        memory = { at: Date.now(), userId, badges: next }
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
        } catch {
          // sin persistencia: queda solo en memoria
        }
        setBadges(next)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [userId, enabled])

  return badges
}
