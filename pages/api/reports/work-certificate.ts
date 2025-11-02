import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    let employeeId: string
    let certificateDate: string | undefined

    if (req.method === 'GET') {
      // GET: query parameters
      const { employeeId: empId, date } = req.query
      
      if (!empId) {
        return res.status(400).json({ 
          error: 'Employee ID required',
          message: 'employeeId parameter is required'
        })
      }
      
      employeeId = empId as string
      certificateDate = date as string | undefined

    } else {
      // POST: body parameters
      const { employeeId: empId, date } = req.body
      
      if (!empId) {
        return res.status(400).json({ 
          error: 'Employee ID required',
          message: 'employeeId is required in request body'
        })
      }
      
      employeeId = empId
      certificateDate = date
    }

    const { data, error } = await supabase.rpc('reports_work_certificate_data', {
      p_company_id: companyId,
      p_employee_id: employeeId,
      p_certificate_date: certificateDate || undefined
    })

    if (error) {
      logger.error('Error calling reports_work_certificate_data RPC', { error, companyId, employeeId })
      return res.status(500).json({ 
        error: 'Error fetching work certificate data',
        details: error.message
      })
    }

    const certificateData = Array.isArray(data) ? data[0] : data

    if (!certificateData) {
      return res.status(404).json({ 
        error: 'Certificate data not found',
        message: 'No data found for the specified employee'
      })
    }

    return res.status(200).json({
      success: true,
      data: certificateData
    })

  } catch (error: any) {
    logger.error('Reports work certificate API error', { error, message: error.message })
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error'
    })
  }
}

