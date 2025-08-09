import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if this is a demo request (has demo_ok cookie)
    const demoCookie = req.cookies['demo_ok']
    if (!demoCookie) {
      return res.status(401).json({ error: 'Demo access required' })
    }

    logger.info('Demo payroll requested')

    // Load payroll fixture
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const fixturesPath = path.join(process.cwd(), 'public', 'demo-fixtures', 'payroll.json')
    const payrollData = JSON.parse(await fs.readFile(fixturesPath, 'utf-8'))

    return res.status(200).json({ data: payrollData })

  } catch (error) {
    logger.error('Error loading demo payroll:', error)
    return res.status(500).json({ error: 'Failed to load demo payroll' })
  }
}
