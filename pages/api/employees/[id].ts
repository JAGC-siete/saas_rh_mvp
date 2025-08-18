import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // DEPRECATED: Use /api/employees/update instead
  return res.status(410).json({ 
    error: 'Endpoint deprecated',
    message: 'This endpoint has been deprecated. Use /api/employees/update instead.',
    migration: {
      old: 'PUT/PATCH /api/employees/[id]',
      new: 'PUT/PATCH /api/employees/update',
      reason: 'Enhanced security with admin client and role validation'
    }
  })
} 