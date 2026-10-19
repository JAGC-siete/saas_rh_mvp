import type { NextApiRequest, NextApiResponse } from 'next'
import { loadPublicVentasConfig } from '../../../lib/ventas/public-config'

/**
 * Public read-only ventas knobs for the /ventas form (no promo codes).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')

  return res.status(200).json(await loadPublicVentasConfig())
}
