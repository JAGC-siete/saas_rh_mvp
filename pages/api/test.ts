import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ 
    message: 'API endpoint funcionando correctamente',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  })
} 