import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    await requireSuperAdmin(req, res)
    const supabase = createAdminClient()

    // Obtener todas las estadísticas en paralelo
    const [
      affiliatesResult,
      commissionsResult,
      companiesResult,
      monthlyGrowthResult
    ] = await Promise.all([
      // Total de afiliados por status
      supabase
        .from('affiliates')
        .select('id, status, created_at'),
      
      // Comisiones por status
      supabase
        .from('commissions')
        .select('id, status, amount, created_at'),
      
      // Empresas referidas (con conteo por afiliado)
      supabase
        .from('companies')
        .select('id, referred_by_affiliate_id, created_at')
        .not('referred_by_affiliate_id', 'is', null),
      
      // Crecimiento mensual (afiliados creados por mes)
      supabase
        .from('affiliates')
        .select('created_at')
        .order('created_at', { ascending: false })
    ])

    const affiliates = affiliatesResult.data || []
    const commissions = commissionsResult.data || []
    const referredCompanies = companiesResult.data || []
    const monthlyData = monthlyGrowthResult.data || []

    // Calcular estadísticas de afiliados por status
    const affiliatesByStatus = {
      pending: affiliates.filter((a: any) => a.status === 'pending').length,
      approved: affiliates.filter((a: any) => a.status === 'approved').length,
      rejected: affiliates.filter((a: any) => a.status === 'rejected').length,
      total: affiliates.length
    }

    // Calcular estadísticas de comisiones
    const commissionsByStatus = {
      pending: commissions.filter((c: any) => c.status === 'pending').length,
      paid: commissions.filter((c: any) => c.status === 'paid').length,
      cancelled: commissions.filter((c: any) => c.status === 'cancelled').length,
      total: commissions.length
    }

    // Calcular totales de comisiones por status
    const commissionsAmountByStatus = {
      pending: commissions
        .filter((c: any) => c.status === 'pending')
        .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0),
      paid: commissions
        .filter((c: any) => c.status === 'paid')
        .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0),
      cancelled: commissions
        .filter((c: any) => c.status === 'cancelled')
        .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0),
      total: commissions.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0)
    }

    // Contar empresas referidas por afiliado
    const companiesByAffiliate = referredCompanies.reduce((acc: any, company: any) => {
      const affiliateId = company.referred_by_affiliate_id
      acc[affiliateId] = (acc[affiliateId] || 0) + 1
      return acc
    }, {})

    // Calcular crecimiento mensual (últimos 12 meses)
    const monthlyGrowth = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const year = date.getFullYear()
      const month = date.getMonth()
      
      const count = monthlyData.filter((a: any) => {
        const createdDate = new Date(a.created_at)
        return createdDate.getFullYear() === year && createdDate.getMonth() === month
      }).length

      return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        count
      }
    }).reverse()

    // Obtener empresas referidas por afiliado (para la tabla)
    const affiliateCompaniesMap: { [key: string]: number } = {}
    referredCompanies.forEach((company: any) => {
      const affiliateId = company.referred_by_affiliate_id
      affiliateCompaniesMap[affiliateId] = (affiliateCompaniesMap[affiliateId] || 0) + 1
    })

    res.status(200).json({
      affiliatesByStatus,
      commissionsByStatus,
      commissionsAmountByStatus,
      totalReferredCompanies: referredCompanies.length,
      companiesByAffiliate: affiliateCompaniesMap,
      monthlyGrowth
    })
  } catch (error: any) {
    console.error('Error fetching affiliate stats:', error)
    if (error.message !== 'UNAUTHORIZED' && error.message !== 'INSUFFICIENT_PERMISSIONS') {
      res.status(500).json({ error: error.message || 'Ocurrió un error en el servidor.' })
    }
  }
}








