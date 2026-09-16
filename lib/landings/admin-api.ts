/**
 * Cliente del dashboard hacia los endpoints protegidos de landings.
 * Manda el Bearer de la sesión del navegador (patrón de lib/auth/browser-auth-headers).
 */

import { getBrowserAuthHeaders } from '../auth/browser-auth-headers'
import type { CreateLandingInput, UpdateLandingInput } from './admin-schema'
import type { LandingLeadsResponse, LandingPageListItem, LandingPageStatus, LandingTemplateKey } from '../../types/landing'

export interface LandingEditRecord {
  id: string
  company_id: string
  title: string
  slug: string
  template_type: LandingTemplateKey
  status: LandingPageStatus
  schema_version: number
  content_json: unknown
  lead_notify_email: string | null
  published_at: string | null
  updated_at: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getBrowserAuthHeaders()
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok) {
    const message =
      typeof body.error === 'string'
        ? body.error
        : `La solicitud falló (${res.status})`
    const detail = typeof body.detail === 'string' ? ` ${body.detail}` : ''
    throw new Error(`${message}${detail}`)
  }

  return body as T
}

export function fetchLandings(): Promise<{ landings: LandingPageListItem[] }> {
  return request('/api/landings')
}

export function createLanding(input: CreateLandingInput): Promise<{ landing: { id: string; slug: string } }> {
  return request('/api/landings', { method: 'POST', body: JSON.stringify(input) })
}

export function fetchLanding(id: string): Promise<{ landing: LandingEditRecord }> {
  return request(`/api/landings/${id}`)
}

export function saveLanding(
  id: string,
  input: UpdateLandingInput
): Promise<{ landing: { id: string; title: string; slug: string; status: LandingPageStatus; updated_at: string } }> {
  return request(`/api/landings/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function publishLanding(
  id: string,
  action: 'publish' | 'unpublish'
): Promise<{ success: true; status: LandingPageStatus; publishedAt?: string; slug?: string }> {
  return request(`/api/landings/${id}/publish`, { method: 'POST', body: JSON.stringify({ action }) })
}

export function archiveLanding(id: string): Promise<{ success: true }> {
  return request(`/api/landings/${id}`, { method: 'DELETE' })
}

export function fetchLandingLeads(id: string): Promise<LandingLeadsResponse> {
  return request(`/api/landings/${id}/leads`)
}
