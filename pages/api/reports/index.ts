import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { requirePlanAndQuota } from '../../../lib/billing/enforce'
import { withReportsRateLimit } from '../../../lib/security/rate-limiting'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Check plan and quota before processing
    await requirePlanAndQuota(supabase, companyId, 'view_reports')

    // Get basic company stats for reports
    const { data: company } = await supabase
      .from('companies')
      .select('name, id')
      .eq('id', companyId)
      .single()

    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    // Get employee count using company filter
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active')

    // Get attendance stats for current month
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { count: attendanceCount } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('date', `${currentMonth}-01`)
      .lte('date', `${currentMonth}-31`)

    // Get payroll stats for current month
    const { count: payrollCount } = await supabase
      .from('payroll_records')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('period_start', `${currentMonth}-01`)
      .lte('period_end', `${currentMonth}-31`)

    const reports = {
      company: {
        id: company.id,
        name: company.name
      },
      stats: {
        employees: employeeCount || 0,
        attendance_records: attendanceCount || 0,
        payroll_records: payrollCount || 0
      },
      available_reports: [
        'attendance_summary',
        'payroll_summary',
        'employee_list',
        'department_breakdown'
      ]
    }

    return res.status(200).json({ 
      success: true, 
      reports 
    })

  } catch (error: any) {
    console.error('Reports error:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }

    if (error.message === 'PLAN_REQUIRED') {
      return res.status(402).json({ error: 'Active plan required to view reports' })
    }

    return res.status(400).json({ 
      error: error.message || 'Failed to fetch reports' 
    })
  }
}

export default withReportsRateLimit()(handler)