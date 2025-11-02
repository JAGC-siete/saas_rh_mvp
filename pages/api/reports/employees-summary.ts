import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { departmentIds } = req.query

    const departmentIdsArray = departmentIds
      ? (Array.isArray(departmentIds) ? departmentIds : departmentIds.split(',').filter((id: string) => id.trim()))
      : null

    const { data, error } = await supabase.rpc('reports_employees_summary', {
      p_company_id: companyId,
      p_department_ids: departmentIdsArray
    })

    if (error) {
      logger.error('Error calling reports_employees_summary RPC', { error, companyId })
      return res.status(500).json({ 
        error: 'Error fetching employees summary',
        details: error.message
      })
    }

    const summary = Array.isArray(data) ? data[0] : data

    return res.status(200).json({
      success: true,
      data: summary,
      summary
    })

  } catch (error: any) {
    logger.error('Reports employees summary API error', { error, message: error.message })
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error'
    })
  }
}

