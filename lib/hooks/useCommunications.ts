import { useCallback, useState } from 'react'
import { logger } from '../logger'
import type { CampaignRow, CommAction, CommBlock, CommSegment, CommStatus, AudiencePreview } from '../communications/schema'

function apiErrorMessage(data: { error?: string; details?: string[] } | null, fallback: string): string {
  if (!data) return fallback
  if (Array.isArray(data.details) && data.details.length) return `${data.error || fallback}: ${data.details.join(', ')}`
  return typeof data.error === 'string' && data.error.trim() ? data.error : fallback
}

export interface CampaignPayload {
  subject: string
  intro?: string | null
  blocks: CommBlock[]
  segment: CommSegment
  cta_url?: string | null
  cta_label?: string | null
  action: CommAction
  scheduled_at?: string | null
  source_commits?: string[] | null
}

export interface RepoCommit {
  sha: string
  shortSha: string
  title: string
  body: string
  type: string | null
  author: string
  date: string
  url: string
}

export interface CommitsResult {
  commits: RepoCommit[]
  notConfigured?: boolean
}

export function useCommunications() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async (status?: CommStatus) => {
    try {
      setIsLoading(true)
      setError(null)
      const qs = status ? `?status=${status}` : ''
      const res = await fetch(`/api/super-admin/communications${qs}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al cargar campañas'))
      }
      const { campaigns: rows } = await res.json()
      setCampaigns(rows || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar campañas'
      setError(msg)
      logger.error('useCommunications.fetchCampaigns', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createCampaign = useCallback(async (payload: CampaignPayload): Promise<{ recipientCount?: number } | null> => {
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch('/api/super-admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Error al guardar la campaña'))
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la campaña'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const updateCampaign = useCallback(
    async (id: string, payload: CampaignPayload): Promise<{ recipientCount?: number } | null> => {
      try {
        setIsSubmitting(true)
        setError(null)
        const res = await fetch(`/api/super-admin/communications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(apiErrorMessage(data, 'Error al actualizar la campaña'))
        return data
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar la campaña'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/super-admin/communications/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al eliminar'))
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
      return false
    }
  }, [])

  const fetchCommits = useCallback(async (): Promise<CommitsResult> => {
    const res = await fetch('/api/super-admin/commits')
    if (res.status === 503) {
      return { commits: [], notConfigured: true }
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(apiErrorMessage(data, 'Error al cargar commits'))
    }
    const { commits } = await res.json()
    return { commits: (commits || []) as RepoCommit[] }
  }, [])

  const fetchAudiencePreview = useCallback(async (segment: CommSegment): Promise<AudiencePreview | null> => {
    try {
      const res = await fetch(`/api/super-admin/communications/audience-preview?segment=${encodeURIComponent(segment)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al cargar preview de audiencia'))
      }
      const { preview } = await res.json()
      return preview as AudiencePreview
    } catch (err) {
      logger.error('useCommunications.fetchAudiencePreview', err)
      return null
    }
  }, [])

  return {
    campaigns,
    isLoading,
    isSubmitting,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    fetchCommits,
    fetchAudiencePreview,
  }
}
