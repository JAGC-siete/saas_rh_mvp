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
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)

    // 1. Fetch all affiliates
    const { data: affiliates, error: affiliatesError } = await adminClient
      .from('affiliates')
      .select('id, user_id, referral_code, status, created_at')

    if (affiliatesError) throw affiliatesError

    // 2. Fetch all auth users and create a map
    const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers()
    if (authUsersError) throw authUsersError
    
    const usersMap = new Map<string, { email: string, full_name: string }>()
    authUsers.users.forEach((authUser: any) => {
      usersMap.set(authUser.id, {
        email: authUser.email || 'N/A',
        full_name: authUser.user_metadata?.full_name || 'N/A'
      })
    })

    // 3. Fetch companies referred by each affiliate
    const { data: referredCompanies, error: companiesError } = await adminClient
      .from('companies')
      .select('id, referred_by_affiliate_id, created_at')
      .not('referred_by_affiliate_id', 'is', null)

    if (companiesError) throw companiesError

    // 4. Fetch commissions for each affiliate
    const { data: commissions, error: commissionsError } = await adminClient
      .from('commissions')
      .select('id, affiliate_id, amount, status, created_at')
      .order('created_at', { ascending: false })

    if (commissionsError) throw commissionsError

    // 5. Calculate stats per affiliate
    const companiesByAffiliate: { [key: string]: number } = {}
    const commissionsByAffiliate: { [key: string]: { total: number; pending: number; paid: number; lastCommission: string | null } } = {}

    referredCompanies?.forEach((company: any) => {
      const affiliateId = company.referred_by_affiliate_id
      companiesByAffiliate[affiliateId] = (companiesByAffiliate[affiliateId] || 0) + 1
    })

    commissions?.forEach((commission: any) => {
      const affiliateId = commission.affiliate_id
      if (!commissionsByAffiliate[affiliateId]) {
        commissionsByAffiliate[affiliateId] = { total: 0, pending: 0, paid: 0, lastCommission: null }
      }
      commissionsByAffiliate[affiliateId].total += parseFloat(commission.amount || 0)
      if (commission.status === 'pending') {
        commissionsByAffiliate[affiliateId].pending += parseFloat(commission.amount || 0)
      } else if (commission.status === 'paid') {
        commissionsByAffiliate[affiliateId].paid += parseFloat(commission.amount || 0)
      }
      if (!commissionsByAffiliate[affiliateId].lastCommission) {
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

    // Audit log
    await auditLog('affiliates_listed', {
      count: formattedAffiliates.length
    })

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
