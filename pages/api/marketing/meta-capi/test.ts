import type { NextApiRequest, NextApiResponse } from 'next'
import {
  isMetaCapiConfigured,
  sendMetaCapiTestEvent,
} from '../../../../lib/analytics/metaCapi'

type SuccessResponse = {
  ok: true
  configured: true
  test_event_code: string
  pixel_id: string
  meta_response: unknown
}

type ErrorResponse = {
  ok: false
  configured: boolean
  error: string
  details?: unknown
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, configured: isMetaCapiConfigured(), error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, configured: isMetaCapiConfigured(), error: 'Unauthorized' })
  }

  if (!isMetaCapiConfigured()) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: 'Meta CAPI no configurado. Definí META_PIXEL_ID y META_CAPI_ACCESS_TOKEN.',
    })
  }

  const testEventCode =
    (typeof req.body?.test_event_code === 'string' && req.body.test_event_code.trim()) ||
    'TEST38433'

  try {
    const result = await sendMetaCapiTestEvent(testEventCode, {
      eventName:
        typeof req.body?.event_name === 'string' ? req.body.event_name : undefined,
      eventSourceUrl:
        typeof req.body?.event_source_url === 'string' ? req.body.event_source_url : undefined,
    })

    if (!result.ok) {
      return res.status(502).json({
        ok: false,
        configured: true,
        error: 'Meta rechazó el evento de prueba',
        details: result.body,
      })
    }

    return res.status(200).json({
      ok: true,
      configured: true,
      test_event_code: testEventCode,
      pixel_id: result.pixelId,
      meta_response: result.body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error enviando evento de prueba'
    return res.status(500).json({
      ok: false,
      configured: isMetaCapiConfigured(),
      error: message,
    })
  }
}
