import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if this is a demo request (has demo_ok cookie)
    const demoCookie = req.cookies['demo_ok']
    if (!demoCookie) {
      return res.status(401).json({ error: 'Demo access required' })
    }

    logger.info('Demo payroll calculation requested')

    const { periodo, quincena } = req.body

    // Simulate payroll calculation success
    const mockResponse = {
      success: true,
      message: `Nómina demo generada para ${periodo} Q${quincena}`,
      records_generated: 10,
      total_gross: 105750,
      total_net: 98212.15,
      period: periodo,
      half: quincena
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    return res.status(200).json(mockResponse)

  } catch (error) {
    logger.error('Error in demo payroll calculation:', error)
    return res.status(500).json({ error: 'Failed to calculate demo payroll' })
  }
}
