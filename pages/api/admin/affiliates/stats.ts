import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

/**
 * Get affiliate program statistics
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, auditLog } = await requireSuperAdminWithAudit(req, res)

    // Fetch all statistics in parallel (with error handling)
    let affiliates: any[] = []
    let commissions: any[] = []
    let referredCompanies: any[] = []
    let monthlyData: any[] = []

    try {
      const [
        affiliatesResult,
        commissionsResult,
        companiesResult,
        monthlyGrowthResult
      ] = await Promise.all([
        // Total affiliates by status
        adminClient
          .from('affiliates')
          .select('id, status, created_at'),
        
        // Commissions by status
        adminClient
          .from('commissions')
          .select('id, status, amount, created_at'),
        
        // Referred companies
        adminClient
          .from('companies')
          .select('id, referred_by_affiliate_id, created_at')
          .not('referred_by_affiliate_id', 'is', null),
        
        // Monthly growth (affiliates created per month)
        adminClient
          .from('affiliates')
          .select('created_at')
          .order('created_at', { ascending: false })
      ])

      affiliates = affiliatesResult.data || []
      commissions = commissionsResult.data || []
      referredCompanies = companiesResult.data || []
      monthlyData = monthlyGrowthResult.data || []
    } catch (queryError: any) {
      logger.error('Error fetching affiliate stats data', {
        error: queryError?.message || String(queryError)
      })
      // Continue with empty arrays - return partial stats
    }

    // Calculate affiliate statistics by status
    const affiliatesByStatus = {
      pending: affiliates.filter((a: any) => a.status === 'pending').length,
      approved: affiliates.filter((a: any) => a.status === 'approved').length,
      rejected: affiliates.filter((a: any) => a.status === 'rejected').length,
      total: affiliates.length
    }

    // Calculate commission statistics
    const commissionsByStatus = {
      pending: commissions.filter((c: any) => c.status === 'pending').length,
      paid: commissions.filter((c: any) => c.status === 'paid').length,
      cancelled: commissions.filter((c: any) => c.status === 'cancelled').length,
      total: commissions.length
    }

    // Calculate commission amounts by status
    const commissionsAmountByStatus = {
      pending: commissions
        .filter((c: any) => c.status === 'pending')
        .reduce((sum: number, c: any) => {
          const amount = parseFloat(c.amount || '0') || 0
          return sum + (isNaN(amount) ? 0 : amount)
        }, 0),
      paid: commissions
        .filter((c: any) => c.status === 'paid')
        .reduce((sum: number, c: any) => {
          const amount = parseFloat(c.amount || '0') || 0
          return sum + (isNaN(amount) ? 0 : amount)
        }, 0),
      cancelled: commissions
        .filter((c: any) => c.status === 'cancelled')
        .reduce((sum: number, c: any) => {
          const amount = parseFloat(c.amount || '0') || 0
          return sum + (isNaN(amount) ? 0 : amount)
        }, 0),
      total: commissions.reduce((sum: number, c: any) => {
        const amount = parseFloat(c.amount || '0') || 0
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0)
    }

    // Count referred companies by affiliate
    const affiliateCompaniesMap: { [key: string]: number } = {}
    referredCompanies.forEach((company: any) => {
      const affiliateId = company.referred_by_affiliate_id
      if (affiliateId) {
        affiliateCompaniesMap[affiliateId] = (affiliateCompaniesMap[affiliateId] || 0) + 1
      }
    })

    // Calculate monthly growth (last 12 months)
    const monthlyGrowth = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const year = date.getFullYear()
      const month = date.getMonth()
      
      const count = monthlyData.filter((a: any) => {
        if (!a.created_at) return false
        const createdDate = new Date(a.created_at)
        return createdDate.getFullYear() === year && createdDate.getMonth() === month
      }).length

      return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        count
      }
    }).reverse()

    // Audit log
    try {
      await auditLog('affiliate_stats_accessed', {
        totalAffiliates: affiliatesByStatus.total,
        totalCommissions: commissionsByStatus.total,
        totalReferredCompanies: referredCompanies.length,
        timestamp: new Date().toISOString()
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    return res.status(200).json(createSuccessResponse({
      affiliatesByStatus,
      commissionsByStatus,
      commissionsAmountByStatus,
      totalReferredCompanies: referredCompanies.length,
      companiesByAffiliate: affiliateCompaniesMap,
      monthlyGrowth
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error fetching affiliate stats', {
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








