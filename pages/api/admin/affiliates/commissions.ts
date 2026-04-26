import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

/**
 * List all commissions
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, auditLog } = await requireSuperAdminWithAudit(req, res)

    // Validate and sanitize query params
    const status = req.query.status as string | undefined
    const pageParam = Number(req.query.page || 1)
    const pageSizeParam = Number(req.query.pageSize || 100)
    const page = Math.max(1, isFinite(pageParam) ? pageParam : 1)
    const pageSize = Math.min(500, Math.max(1, isFinite(pageSizeParam) ? pageSizeParam : 100))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Validate status if provided
    const validStatuses = ['pending', 'paid', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json(createErrorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        'VALIDATION_ERROR'
      ))
    }

    // Fetch commissions (with pagination)
    let commissions: any[] = []
    let commissionsCount = 0
    
    try {
      let query = adminClient
        .from('commissions')
        .select('id, affiliate_id, referred_company_id, amount, status, created_at, paid_at', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: commissionsError, count } = await query.range(from, to)

      if (commissionsError) {
        logger.warn('Error fetching commissions (continuing without commission data)', {
          error: commissionsError?.message || String(commissionsError)
        })
      } else {
        commissions = data || []
        commissionsCount = count || 0
      }
    } catch (commissionsError: any) {
      logger.warn('Unexpected error fetching commissions (continuing without commission data)', {
        error: commissionsError?.message || String(commissionsError)
      })
    }

    // Fetch affiliates to get names (continue if fails)
    let affiliates: any[] = []
    try {
      const { data, error: affiliatesError } = await adminClient
        .from('affiliates')
        .select('id, user_id')

      if (affiliatesError) {
        logger.warn('Error fetching affiliates for commissions (continuing without affiliate names)', {
          error: affiliatesError?.message || String(affiliatesError)
        })
      } else {
        affiliates = data || []
      }
    } catch (affiliatesError: any) {
      logger.warn('Unexpected error fetching affiliates (continuing without affiliate names)', {
        error: affiliatesError?.message || String(affiliatesError)
      })
    }

    // Fetch auth users to get affiliate names (with pagination)
    // Note: If this fails, we continue without affiliate name data
    const usersMap = new Map<string, string>()
    
    try {
      let page = 1
      let hasMore = true
      const perPage = 1000 // Max per page for listUsers
      let fetchedCount = 0
      
      while (hasMore) {
        const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers({
          page,
          perPage
        })
        
        if (authUsersError) {
          logger.info('Unable to fetch auth users for commissions (continuing without affiliate names)', { 
            page, 
            error: authUsersError?.message || String(authUsersError),
            fetchedSoFar: fetchedCount
          })
          break
        }
        
        if (authUsers?.users && authUsers.users.length > 0) {
          authUsers.users.forEach((user: any) => {
            usersMap.set(user.id, user.user_metadata?.full_name || user.email || 'N/A')
          })
          
          fetchedCount += authUsers.users.length
          
          // Check if there are more pages
          hasMore = authUsers.users.length === perPage
          page++
        } else {
          hasMore = false
        }
      }
      
      if (fetchedCount > 0) {
        logger.debug('Successfully fetched auth users for commissions', { count: fetchedCount })
      }
    } catch (authError: any) {
      logger.warn('Unexpected error fetching auth users for commissions (continuing without affiliate names)', {
        error: authError?.message || String(authError)
      })
    }

    const affiliatesMap = new Map<string, string>()
    affiliates.forEach(affiliate => {
      const userName = usersMap.get(affiliate.user_id) || 'N/A'
      affiliatesMap.set(affiliate.id, userName)
    })

    // Fetch companies to get names (continue if fails)
    let companies: any[] = []
    try {
      const { data, error: companiesError } = await adminClient
        .from('companies')
        .select('id, name')

      if (companiesError) {
        logger.warn('Error fetching companies for commissions (continuing without company names)', {
          error: companiesError?.message || String(companiesError)
        })
      } else {
        companies = data || []
      }
    } catch (companiesError: any) {
      logger.warn('Unexpected error fetching companies (continuing without company names)', {
        error: companiesError?.message || String(companiesError)
      })
    }

    const companiesMap = new Map<string, string>()
    companies.forEach(company => {
      companiesMap.set(company.id, company.name)
    })

    // Combine data
    const formattedCommissions = commissions.map(commission => {
      const amount = parseFloat(commission.amount || '0') || 0
      return {
        ...commission,
        amount: isNaN(amount) ? 0 : amount,
        affiliate_name: affiliatesMap.get(commission.affiliate_id) || 'N/A',
        company_name: companiesMap.get(commission.referred_company_id) || 'N/A'
      }
    })

    // Audit log
    try {
      await auditLog('commissions_listed', {
        count: formattedCommissions.length,
        total: commissionsCount,
        filters: {
          status: status || 'all',
          page,
          pageSize
        }
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    return res.status(200).json(createSuccessResponse({
      commissions: formattedCommissions,
      pagination: {
        page,
        pageSize,
        total: commissionsCount,
        totalPages: Math.ceil(commissionsCount / pageSize)
      }
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error fetching commissions', {
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json(createErrorResponse(
      'An internal server error occurred',
      'INTERNAL_ERROR',
      { details: error.message }
    ))
  }
}
