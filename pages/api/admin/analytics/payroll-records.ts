import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createSecureErrorResponse } from '../../../../lib/security/error-handling'

interface PayrollRecordsResponse {
  success: boolean
  data?: any[]
  metadata?: {
    total: number
    page: number
    pageSize: number
    filters?: any
  }
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PayrollRecordsResponse>
) {
  try {
    // Verify super admin
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      return await getPayrollRecords(req, res)
    }

    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Method ${req.method} not allowed`
    })
  } catch (error: any) {
    // If error from requireSuperAdmin, it already sent response
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in payroll-records admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getPayrollRecords(req: NextApiRequest, res: NextApiResponse<PayrollRecordsResponse>) {
  try {
    const adminClient = createAdminClient()

    // Query params for filtering
    const companyId = req.query.company_id as string | undefined
    const employeeId = req.query.employee_id as string | undefined
    const startDate = req.query.start_date as string | undefined
    const endDate = req.query.end_date as string | undefined
    const status = req.query.status as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query - get records with employee and company info
    let query = adminClient
      .from('payroll_records')
      .select(`
        id,
        employee_id,
        period_start,
        period_end,
        period_type,
        base_salary,
        overtime_hours,
        overtime_amount,
        bonuses,
        commissions,
        other_earnings,
        gross_salary,
        income_tax,
        social_security,
        professional_tax,
        other_deductions,
        total_deductions,
        net_salary,
        days_worked,
        days_absent,
        late_days,
        status,
        approved_by,
        approved_at,
        paid_at,
        notes,
        created_at,
        updated_at,
        employees (
          id,
          name,
          employee_code,
          company_id,
          companies (
            id,
            name
          )
        )
      `, { count: 'exact' })

    // Apply filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (startDate) {
      query = query.gte('period_start', startDate)
    }

    if (endDate) {
      query = query.lte('period_end', endDate)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Order and paginate
    query = query
      .order('period_start', { ascending: false })
      .range(from, to)

    const { data: records, error, count } = await query

    if (error) {
      throw error
    }

    // Filter by company if needed (since payroll_records doesn't have direct company_id)
    let filteredRecords = records || []
    if (companyId) {
      filteredRecords = filteredRecords.filter((record: any) => 
        record.employees?.company_id === companyId
      )
    }

    // Format response
    const recordsFormatted = filteredRecords.map((record: any) => ({
      id: record.id,
      employee_id: record.employee_id,
      employee_name: record.employees?.name || 'Unknown',
      employee_code: record.employees?.employee_code || '-',
      company_id: record.employees?.company_id || null,
      company_name: record.employees?.companies?.name || 'Unknown',
      period_start: record.period_start,
      period_end: record.period_end,
      period_type: record.period_type,
      base_salary: parseFloat(record.base_salary) || 0,
      overtime_hours: parseFloat(record.overtime_hours) || 0,
      overtime_amount: parseFloat(record.overtime_amount) || 0,
      bonuses: parseFloat(record.bonuses) || 0,
      commissions: parseFloat(record.commissions) || 0,
      other_earnings: parseFloat(record.other_earnings) || 0,
      gross_salary: parseFloat(record.gross_salary) || 0,
      income_tax: parseFloat(record.income_tax) || 0,
      social_security: parseFloat(record.social_security) || 0,
      professional_tax: parseFloat(record.professional_tax) || 0,
      other_deductions: parseFloat(record.other_deductions) || 0,
      total_deductions: parseFloat(record.total_deductions) || 0,
      net_salary: parseFloat(record.net_salary) || 0,
      days_worked: record.days_worked || 0,
      days_absent: record.days_absent || 0,
      late_days: record.late_days || 0,
      status: record.status,
      approved_by: record.approved_by,
      approved_at: record.approved_at,
      paid_at: record.paid_at,
      notes: record.notes,
      created_at: record.created_at,
      updated_at: record.updated_at
    }))

    logger.info('Payroll records retrieved', {
      count: recordsFormatted.length,
      total: count,
      filters: { companyId, employeeId, startDate, endDate, status }
    })

    return res.status(200).json({
      success: true,
      data: recordsFormatted,
      metadata: {
        total: companyId ? recordsFormatted.length : (count || 0),
        page,
        pageSize,
        filters: {
          company_id: companyId || null,
          employee_id: employeeId || null,
          start_date: startDate || null,
          end_date: endDate || null,
          status: status || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching payroll records', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll records',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

