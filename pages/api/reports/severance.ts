import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { employeeId, terminationDate } = req.body

    if (!employeeId || !terminationDate) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Both employeeId and terminationDate are required'
      })
    }

    // Validate date format
    const parsedDate = new Date(terminationDate)
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format',
        message: 'terminationDate must be a valid date (YYYY-MM-DD)'
      })
    }

    const { data, error } = await supabase.rpc('reports_calculate_severance', {
      p_company_id: companyId,
      p_employee_id: employeeId,
      p_termination_date: terminationDate
    })

    if (error) {
      logger.error('Error calling reports_calculate_severance RPC', { error, companyId, employeeId })
      return res.status(500).json({ 
        error: 'Error calculating severance',
        details: error.message
      })
    }

    const calculation = Array.isArray(data) ? data[0] : data

    if (!calculation) {
      return res.status(404).json({ 
        error: 'Calculation failed',
        message: 'Could not calculate severance for the specified employee'
      })
    }

    return res.status(200).json({
      success: true,
      data: calculation
    })

  } catch (error: any) {
    logger.error('Reports severance API error', { error, message: error.message })
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error'
    })
  }
}

