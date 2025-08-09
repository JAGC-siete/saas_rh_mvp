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

    logger.info('Demo employees requested')

    // Load employees fixture
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const fixturesPath = path.join(process.cwd(), 'public', 'demo-fixtures', 'employees.json')
    const employeesData = JSON.parse(await fs.readFile(fixturesPath, 'utf-8'))

    // Filter by query params if needed
    const { department_id, search, status = 'active' } = req.query

    let filteredEmployees = employeesData.filter((emp: any) => emp.status === status)

    if (department_id && department_id !== 'all') {
      filteredEmployees = filteredEmployees.filter((emp: any) => emp.department_id === department_id)
    }

    if (search) {
      const searchLower = (search as string).toLowerCase()
      filteredEmployees = filteredEmployees.filter((emp: any) =>
        emp.full_name.toLowerCase().includes(searchLower) ||
        emp.dni_last5.includes(search) ||
        emp.position?.toLowerCase().includes(searchLower)
      )
    }

    return res.status(200).json({ data: filteredEmployees })

  } catch (error) {
    logger.error('Error loading demo employees:', error)
    return res.status(500).json({ error: 'Failed to load demo employees' })
  }
}
