import type { NextApiRequest } from 'next'
import { logger } from '../logger'
import { getTrustedClientIp } from '../security/trusted-client-ip'
import {
  isMetaCapiConfigured,
  sendMetaCapiEvents,
  type MetaCapiEventInput,
  type MetaCapiUserData,
} from './metaCapi'

export interface MetaTrackingPayload {
  meta_event_id?: string
  meta_event_source_url?: string
  meta_fbc?: string
  meta_fbp?: string
}

export function parseMetaTrackingPayload(body: unknown): MetaTrackingPayload {
  if (!body || typeof body !== 'object') return {}
  const record = body as Record<string, unknown>
  const read = (key: string) => {
    const v = record[key]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  return {
    meta_event_id: read('meta_event_id'),
    meta_event_source_url: read('meta_event_source_url'),
    meta_fbc: read('meta_fbc'),
    meta_fbp: read('meta_fbp'),
  }
}

function parseCookie(req: NextApiRequest, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  const match = header.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`))
  if (!match?.[1]) return undefined
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function buildMetaCapiUserDataFromRequest(
  req: NextApiRequest,
  tracking: MetaTrackingPayload,
  identity: Pick<MetaCapiUserData, 'email' | 'phone' | 'firstName' | 'lastName'>
): MetaCapiUserData {
  const ip = getTrustedClientIp(req)
  return {
    ...identity,
    clientIpAddress: ip !== 'unknown' ? ip : undefined,
    clientUserAgent: String(req.headers['user-agent'] || '').slice(0, 512) || undefined,
    fbc: tracking.meta_fbc || parseCookie(req, '_fbc'),
    fbp: tracking.meta_fbp || parseCookie(req, '_fbp'),
  }
}

export interface SendMetaWebsiteConversionInput {
  req: NextApiRequest
  eventName: string
  tracking: MetaTrackingPayload
  userData: Pick<MetaCapiUserData, 'email' | 'phone' | 'firstName' | 'lastName'>
  customData?: Record<string, string | number | boolean>
}

/** Envía CAPI sin bloquear la respuesta HTTP; no-op si falta token. */
export function sendMetaWebsiteConversionFireAndForget(input: SendMetaWebsiteConversionInput): void {
  if (!isMetaCapiConfigured()) return
  if (!input.tracking.meta_event_id) return

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://humanosisu.net'
  const event: MetaCapiEventInput = {
    eventName: input.eventName,
    eventId: input.tracking.meta_event_id,
    eventSourceUrl: input.tracking.meta_event_source_url || siteUrl,
    actionSource: 'website',
    userData: buildMetaCapiUserDataFromRequest(input.req, input.tracking, input.userData),
    customData: input.customData,
  }

  void sendMetaCapiEvents([event])
    .then((result) => {
      if (!result.ok) {
        logger.warn('Meta CAPI rechazó evento', {
          eventName: input.eventName,
          eventId: input.tracking.meta_event_id,
          status: result.status,
          body: result.body,
        })
      }
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('Meta CAPI error al enviar evento', {
        eventName: input.eventName,
        eventId: input.tracking.meta_event_id,
        error: message,
      })
    })
}
