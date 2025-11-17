import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createSecureErrorResponse } from '../../../../lib/security/error-handling'

interface PayrollRunsResponse {
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
  res: NextApiResponse<PayrollRunsResponse>
) {
  try {
    // Verify super admin
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      return await getPayrollRuns(req, res)
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
    logger.error('Error in payroll-runs admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getPayrollRuns(req: NextApiRequest, res: NextApiResponse<PayrollRunsResponse>) {
  try {
    const adminClient = createAdminClient()

    // Query params for filtering
    const companyId = req.query.company_id as string | undefined
    const year = req.query.year as string | undefined
    const month = req.query.month as string | undefined
    const status = req.query.status as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Check which column exists (company_id or company_uuid)
    let companyColumn = 'company_id'
    const { data: checkData } = await adminClient
      .from('payroll_runs')
      .select('*')
      .limit(1)
    
    if (checkData && checkData.length > 0) {
      if ('company_uuid' in checkData[0]) {
        companyColumn = 'company_uuid'
      }
    }

    // Base query - get runs with aggregated line data
    let query = adminClient
      .from('payroll_runs')
      .select(`
        id,
        ${companyColumn},
        year,
        month,
        quincena,
        tipo,
        status,
        created_by,
        created_at,
        updated_at,
        companies!${companyColumn} (
          id,
          name
        )
      `, { count: 'exact' })

    // Apply filters
    if (companyId) {
      query = query.eq(companyColumn, companyId)
    }

    if (year) {
      query = query.eq('year', parseInt(year))
    }

    if (month) {
      query = query.eq('month', parseInt(month))
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Order and paginate
    query = query
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('quincena', { ascending: false })
      .range(from, to)

    const { data: runs, error, count } = await query

    if (error) {
      throw error
    }

    // Get line counts and totals for each run
    const runIds = runs?.map((r: any) => r.id) || []
    const linesData = new Map<string, { count: number; totalGross: number; totalNet: number }>()

    if (runIds.length > 0) {
      const { data: lines } = await adminClient
        .from('payroll_run_lines')
        .select('run_id, eff_bruto, eff_neto')
        .in('run_id', runIds)

      lines?.forEach((line: any) => {
        const existing = linesData.get(line.run_id) || { count: 0, totalGross: 0, totalNet: 0 }
        linesData.set(line.run_id, {
          count: existing.count + 1,
          totalGross: existing.totalGross + (parseFloat(line.eff_bruto) || 0),
          totalNet: existing.totalNet + (parseFloat(line.eff_neto) || 0)
        })
      })
    }

    // Format response with company name and line stats
    const runsFormatted = runs?.map((run: any) => {
      const lineStats = linesData.get(run.id) || { count: 0, totalGross: 0, totalNet: 0 }
      return {
        id: run.id,
        company_id: run[companyColumn],
        company_name: run.companies?.name || 'Unknown',
        year: run.year,
        month: run.month,
        quincena: run.quincena,
        tipo: run.tipo,
        status: run.status,
        employee_count: lineStats.count,
        total_gross: lineStats.totalGross,
        total_net: lineStats.totalNet,
        created_by: run.created_by,
        created_at: run.created_at,
        updated_at: run.updated_at
      }
    }) || []

    logger.info('Payroll runs retrieved', {
      count: runsFormatted.length,
      total: count,
      filters: { companyId, year, month, status }
    })

    return res.status(200).json({
      success: true,
      data: runsFormatted,
      metadata: {
        total: count || 0,
        page,
        pageSize,
        filters: {
          company_id: companyId || null,
          year: year || null,
          month: month || null,
          status: status || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching payroll runs', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll runs',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

