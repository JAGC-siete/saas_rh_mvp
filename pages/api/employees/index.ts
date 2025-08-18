import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // DEPRECATED: Use /api/employees/create instead
  return res.status(410).json({ 
    error: 'Endpoint deprecated',
    message: 'This endpoint has been deprecated. Use /api/employees/create instead.',
    migration: {
      old: 'POST /api/employees',
      new: 'POST /api/employees/create',
      reason: 'Enhanced security with admin client and role validation'
    }
  })
} 