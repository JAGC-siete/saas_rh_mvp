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

    const {
      status = 'all',
      departmentIds
    } = req.query

    const departmentIdsArray = departmentIds
      ? (Array.isArray(departmentIds) ? departmentIds : departmentIds.split(',').filter((id: string) => id.trim()))
      : null

    const { data, error } = await supabase.rpc('reports_employees', {
      p_company_id: companyId,
      p_status_filter: status as string,
      p_department_ids: departmentIdsArray
    })

    if (error) {
      logger.error('Error calling reports_employees RPC', { error, companyId })
      return res.status(500).json({ 
        error: 'Error fetching employees report',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    logger.error('Reports employees API error', { error, message: error.message })
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error'
    })
  }
}

