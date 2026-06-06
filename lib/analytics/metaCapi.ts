import { createHash } from 'crypto'

const GRAPH_API_VERSION = 'v21.0'

export type MetaCapiActionSource =
  | 'website'
  | 'app'
  | 'phone_call'
  | 'chat'
  | 'email'
  | 'other'
  | 'physical_store'
  | 'system_generated'

export interface MetaCapiUserData {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbc?: string
  fbp?: string
}

export interface MetaCapiEventInput {
  eventName: string
  eventTime?: number
  eventId?: string
  eventSourceUrl?: string
  actionSource?: MetaCapiActionSource
  userData?: MetaCapiUserData
  customData?: Record<string, string | number | boolean>
}

export interface MetaCapiSendOptions {
  testEventCode?: string
}

export interface MetaCapiSendResult {
  ok: boolean
  status: number
  body: unknown
  pixelId: string
}

function sha256Normalized(value: string): string {
  const normalized = value.trim().toLowerCase()
  return createHash('sha256').update(normalized).digest('hex')
}

function buildUserData(userData?: MetaCapiUserData): Record<string, string | string[]> {
  if (!userData) return {}

  const payload: Record<string, string | string[]> = {}

  if (userData.email) payload.em = [sha256Normalized(userData.email)]
  if (userData.phone) payload.ph = [sha256Normalized(userData.phone.replace(/\D/g, ''))]
  if (userData.firstName) payload.fn = [sha256Normalized(userData.firstName)]
  if (userData.lastName) payload.ln = [sha256Normalized(userData.lastName)]
  if (userData.clientIpAddress) payload.client_ip_address = userData.clientIpAddress
  if (userData.clientUserAgent) payload.client_user_agent = userData.clientUserAgent
  if (userData.fbc) payload.fbc = userData.fbc
  if (userData.fbp) payload.fbp = userData.fbp

  return payload
}

function getMetaCapiConfig(): { pixelId: string; accessToken: string } | null {
  const pixelId =
    process.env['META_PIXEL_ID']?.trim() ||
    process.env['NEXT_PUBLIC_META_PIXEL_ID']?.trim() ||
    '833142547420951'
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim()
  if (!accessToken) return null
  return { pixelId, accessToken }
}

export function isMetaCapiConfigured(): boolean {
  return getMetaCapiConfig() !== null
}

export async function sendMetaCapiEvents(
  events: MetaCapiEventInput[],
  options: MetaCapiSendOptions = {}
): Promise<MetaCapiSendResult> {
  const config = getMetaCapiConfig()
  if (!config) {
    throw new Error('Meta CAPI no configurado: faltan META_PIXEL_ID o META_CAPI_ACCESS_TOKEN')
  }

  const data = events.map((event) => {
    const payload: Record<string, unknown> = {
      event_name: event.eventName,
      event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
      action_source: event.actionSource ?? 'website',
      user_data: buildUserData(event.userData),
    }

    if (event.eventId) payload.event_id = event.eventId
    if (event.eventSourceUrl) payload.event_source_url = event.eventSourceUrl
    if (event.customData && Object.keys(event.customData).length > 0) {
      payload.custom_data = event.customData
    }

    return payload
  })

  const body: Record<string, unknown> = { data }
  if (options.testEventCode?.trim()) {
    body.test_event_code = options.testEventCode.trim()
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${config.pixelId}/events`)
  url.searchParams.set('access_token', config.accessToken)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const responseBody = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    status: response.status,
    body: responseBody,
    pixelId: config.pixelId,
  }
}

export async function sendMetaCapiTestEvent(
  testEventCode: string,
  overrides: Partial<MetaCapiEventInput> = {}
): Promise<MetaCapiSendResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://humanosisu.net'

  return sendMetaCapiEvents(
    [
      {
        eventName: overrides.eventName ?? 'PageView',
        eventSourceUrl: overrides.eventSourceUrl ?? siteUrl,
        actionSource: overrides.actionSource ?? 'website',
        eventId: overrides.eventId ?? `test_${Date.now()}`,
        userData: {
          clientIpAddress: overrides.userData?.clientIpAddress ?? '127.0.0.1',
          clientUserAgent:
            overrides.userData?.clientUserAgent ??
            'HumanoSISU-MetaCAPI-Test/1.0',
          ...overrides.userData,
        },
        customData: overrides.customData,
      },
    ],
    { testEventCode }
  )
}
