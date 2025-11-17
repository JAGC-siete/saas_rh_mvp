import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createSecureErrorResponse } from '../../../../lib/security/error-handling'

interface MetersResponse {
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
  res: NextApiResponse<MetersResponse>
) {
  try {
    // Verify super admin
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      return await getMeters(req, res)
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
    logger.error('Error in meters admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getMeters(req: NextApiRequest, res: NextApiResponse<MetersResponse>) {
  try {
    const adminClient = createAdminClient()

    // Query params for filtering
    const companyId = req.query.company_id as string | undefined
    const month = req.query.month as string | undefined
    const year = req.query.year as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query
    let query = adminClient
      .from('company_meters')
      .select(`
        id,
        company_id,
        month,
        pdfs_generated,
        vouchers_sent,
        attendances_recorded,
        employees_created,
        created_at,
        updated_at,
        companies (
          id,
          name
        )
      `, { count: 'exact' })

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (year) {
      // Filter by year
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte('month', startDate).lte('month', endDate)
    }

    if (month && year) {
      // Filter by specific month
      const monthDate = `${year}-${month.padStart(2, '0')}-01`
      query = query.eq('month', monthDate)
    }

    // Order and paginate
    query = query.order('month', { ascending: false }).range(from, to)

    const { data: meters, error, count } = await query

    if (error) {
      throw error
    }

    // Calculate totals per row
    const metersWithTotals = meters?.map((meter: any) => ({
      ...meter,
      company_name: meter.companies?.name || 'Unknown',
      total_usage: (
        (meter.pdfs_generated || 0) +
        (meter.vouchers_sent || 0) +
        (meter.attendances_recorded || 0) +
        (meter.employees_created || 0)
      )
    })) || []

    logger.info('Meters retrieved', {
      count: metersWithTotals.length,
      total: count,
      filters: { companyId, month, year }
    })

    return res.status(200).json({
      success: true,
      data: metersWithTotals,
      metadata: {
        total: count || 0,
        page,
        pageSize,
        filters: {
          company_id: companyId || null,
          month: month || null,
          year: year || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching meters', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch meters',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

