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

    logger.info('Demo attendance requested')

    // Load attendance fixture
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const fixturesPath = path.join(process.cwd(), 'public', 'demo-fixtures', 'attendance.json')
    const attendanceData = JSON.parse(await fs.readFile(fixturesPath, 'utf-8'))

    // Filter by date range if provided
    const { from, to } = req.query

    let filteredAttendance = attendanceData

    if (from || to) {
      filteredAttendance = attendanceData.filter((record: any) => {
        const recordDate = new Date(record.date).toISOString().split('T')[0]
        
        if (from && recordDate < from) return false
        if (to && recordDate > to) return false
        
        return true
      })
    }

    return res.status(200).json({ data: filteredAttendance })

  } catch (error) {
    logger.error('Error loading demo attendance:', error)
    return res.status(500).json({ error: 'Failed to load demo attendance' })
  }
}
