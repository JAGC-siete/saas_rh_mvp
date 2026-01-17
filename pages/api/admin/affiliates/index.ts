import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Super Admin check with audit logging
    const { adminClient, auditLog } = await requireSuperAdminWithAudit(req, res)

    // 1. Fetch all affiliates
    const { data: affiliates, error: affiliatesError } = await adminClient
      .from('affiliates')
      .select('id, user_id, referral_code, status, created_at')

    if (affiliatesError) {
      logger.error('Error fetching affiliates', { 
        error: affiliatesError?.message || String(affiliatesError),
        code: affiliatesError?.code
      })
      // Return error response instead of throwing
      return res.status(500).json(createErrorResponse(
        'Error al obtener afiliados de la base de datos',
        'DATABASE_ERROR',
        { details: affiliatesError?.message }
      ))
    }

    if (!affiliates || affiliates.length === 0) {
      // No affiliates found - return empty array
      try {
        await auditLog('affiliates_listed', { count: 0 })
      } catch (auditError: any) {
        logger.warn('Error logging audit (continuing)', {
          error: auditError?.message || String(auditError)
        })
      }
      return res.status(200).json(createSuccessResponse({ affiliates: [] }))
    }

    // 2. Fetch all auth users and create a map (with pagination)
    // Note: If this fails, we continue without user email/name data
    const usersMap = new Map<string, { email: string, full_name: string }>()
    
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
          // Log once at info level - this is expected to fail sometimes in production
          logger.info('Unable to fetch auth users for affiliates (continuing without email/name data)', { 
            page, 
            error: authUsersError?.message || String(authUsersError),
            fetchedSoFar: fetchedCount
          })
          break
        }
        
        if (authUsers?.users && authUsers.users.length > 0) {
          authUsers.users.forEach((authUser: any) => {
            usersMap.set(authUser.id, {
              email: authUser.email || 'N/A',
              full_name: authUser.user_metadata?.full_name || 'N/A'
            })
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
        logger.debug('Successfully fetched auth users for affiliates', { count: fetchedCount })
      }
    } catch (authError: any) {
      // This catch is for unexpected errors (not the expected listUsers errors)
      logger.warn('Unexpected error fetching auth users for affiliates (continuing without email/name data)', {
        error: authError?.message || String(authError)
      })
      // Continue without user data - affiliates will show 'N/A' for email/name
    }

    // 3. Fetch companies referred by each affiliate (continue if fails)
    let referredCompanies: any[] = []
    try {
      const { data, error: companiesError } = await adminClient
        .from('companies')
        .select('id, referred_by_affiliate_id, created_at')
        .not('referred_by_affiliate_id', 'is', null)

      if (companiesError) {
        logger.warn('Error fetching referred companies (continuing without company data)', { 
          error: companiesError?.message || String(companiesError) 
        })
      } else {
        referredCompanies = data || []
      }
    } catch (companiesError: any) {
      logger.warn('Unexpected error fetching referred companies (continuing without company data)', {
        error: companiesError?.message || String(companiesError)
      })
      // Continue without company data
    }

    // 4. Fetch commissions for each affiliate (continue if fails)
    let commissions: any[] = []
    try {
      const { data, error: commissionsError } = await adminClient
        .from('commissions')
        .select('id, affiliate_id, amount, status, created_at')
        .order('created_at', { ascending: false })

      if (commissionsError) {
        logger.warn('Error fetching commissions (continuing without commission data)', { 
          error: commissionsError?.message || String(commissionsError) 
        })
      } else {
        commissions = data || []
      }
    } catch (commissionsError: any) {
      logger.warn('Unexpected error fetching commissions (continuing without commission data)', {
        error: commissionsError?.message || String(commissionsError)
      })
      // Continue without commission data
    }

    // 5. Calculate stats per affiliate
    const companiesByAffiliate: { [key: string]: number } = {}
    const commissionsByAffiliate: { [key: string]: { total: number; pending: number; paid: number; lastCommission: string | null } } = {}

    referredCompanies?.forEach((company: any) => {
      const affiliateId = company.referred_by_affiliate_id
      companiesByAffiliate[affiliateId] = (companiesByAffiliate[affiliateId] || 0) + 1
    })

    commissions?.forEach((commission: any) => {
      const affiliateId = commission.affiliate_id
      if (!affiliateId) return // Skip commissions without affiliate_id
      
      if (!commissionsByAffiliate[affiliateId]) {
        commissionsByAffiliate[affiliateId] = { total: 0, pending: 0, paid: 0, lastCommission: null }
      }
      
      const amount = parseFloat(commission.amount || '0') || 0
      if (isNaN(amount)) {
        logger.warn('Invalid commission amount', { commissionId: commission.id, amount: commission.amount })
        return
      }
      
      commissionsByAffiliate[affiliateId].total += amount
      if (commission.status === 'pending') {
        commissionsByAffiliate[affiliateId].pending += amount
      } else if (commission.status === 'paid') {
        commissionsByAffiliate[affiliateId].paid += amount
      }
      if (!commissionsByAffiliate[affiliateId].lastCommission && commission.created_at) {
        commissionsByAffiliate[affiliateId].lastCommission = commission.created_at
      }
    })

    // 6. Combine the data
    const formattedAffiliates = affiliates.map((affiliate: any) => {
      const userData = usersMap.get(affiliate.user_id)
      return {
        ...affiliate,
        user_email: userData?.email || 'N/A',
        user_name: userData?.full_name || 'N/A',
        companies_referred: companiesByAffiliate[affiliate.id] || 0,
        commissions_total: commissionsByAffiliate[affiliate.id]?.total || 0,
        commissions_pending: commissionsByAffiliate[affiliate.id]?.pending || 0,
        commissions_paid: commissionsByAffiliate[affiliate.id]?.paid || 0,
        last_commission: commissionsByAffiliate[affiliate.id]?.lastCommission || null,
      }
    })

    // Audit log (don't fail if this errors)
    try {
      await auditLog('affiliates_listed', {
        count: formattedAffiliates.length
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
      // Continue - audit logging failure shouldn't break the response
    }

    return res.status(200).json(createSuccessResponse({ affiliates: formattedAffiliates }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Error fetching affiliates', {
      error: error.message,
      stack: error.stack
    })
    return res.status(500).json(createErrorResponse(
      error.message || 'Ocurrió un error en el servidor.',
      'INTERNAL_ERROR'
    ))
  }
}
