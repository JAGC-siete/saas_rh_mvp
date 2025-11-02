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

    // Parse query parameters
    const {
      from,
      to,
      employeeIds,
      departmentIds,
      status
    } = req.query

    // Validate required parameters
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'Date range required', 
        message: 'Both "from" and "to" dates are required' 
      })
    }

    // Parse employee IDs if provided
    let employeeIdsArray: string[] | null = null
    if (employeeIds) {
      employeeIdsArray = Array.isArray(employeeIds) 
        ? employeeIds 
        : employeeIds.split(',').filter(id => id.trim())
    }

    // Parse department IDs if provided
    let departmentIdsArray: string[] | null = null
    if (departmentIds) {
      departmentIdsArray = Array.isArray(departmentIds)
        ? departmentIds
        : departmentIds.split(',').filter(id => id.trim())
    }

    // Parse status filter if provided
    let statusArray: string[] | null = null
    if (status) {
      statusArray = Array.isArray(status)
        ? status
        : status.split(',').filter(s => s.trim())
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('reports_attendance', {
      p_company_id: companyId,
      p_from: from as string,
      p_to: to as string,
      p_employee_ids: employeeIdsArray,
      p_department_ids: departmentIdsArray,
      p_status_filter: statusArray
    })

    if (error) {
      logger.error('Error calling reports_attendance RPC', { error, companyId })
      return res.status(500).json({ 
        error: 'Error fetching attendance report',
        details: error.message 
      })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    logger.error('Reports attendance API error', { error, message: error.message })
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    if (error.message === 'COMPANY_ACCESS_REQUIRED') {
      return res.status(400).json({ error: 'Company access required' })
    }

    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}

