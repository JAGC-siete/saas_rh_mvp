import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

/**
 * Debug log ingestion endpoint (same-origin) to bypass CSP.
 *
 * IMPORTANT:
 * - This is intended for local/agent debugging only.
 * - Do not send secrets/PII in payloads.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    // Only accept logs for this debug session.
    if (!body || body.sessionId !== '25b418') {
      return res.status(204).end()
    }

    const logPath = path.join(process.cwd(), '.cursor', 'debug-25b418.log')
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.appendFileSync(logPath, `${JSON.stringify(body)}\n`, 'utf8')

    return res.status(204).end()
  } catch {
    // Never leak details via API response
    return res.status(204).end()
  }
}

