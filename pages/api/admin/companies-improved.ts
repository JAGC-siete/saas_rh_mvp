import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

interface ListResponse {
  success: boolean
  companies?: any[]
  metadata?: {
    total: number
    page: number
    pageSize: number
  }
  error?: string
  message?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()

    // Auth: require super_admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Super admin access required' })
    }

    // Query params
    const q = (req.query.q as string | undefined)?.trim().toLowerCase() || ''
    const activeParam = req.query.active as string | undefined
    const pageParam = Number(req.query.page || 1)
    const pageSizeParam = Number(req.query.pageSize || 12)
    const orderBy = (req.query.orderBy as string) || 'created_at'
    const orderDir = ((req.query.orderDir as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

    const page = Math.max(1, isFinite(pageParam) ? pageParam : 1)
    const pageSize = Math.min(100, Math.max(1, isFinite(pageSizeParam) ? pageSizeParam : 12))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Build base query with employee count via RPC style select
    let baseQuery = supabase
      .from('companies')
      .select(`
        id,
        name,
        subdomain,
        plan_type,
        is_active,
        deleted_at,
        created_at,
        employees:employees(count)
      `, { count: 'exact' })

    // Exclude soft-deleted by default
    baseQuery = baseQuery.is('deleted_at', null)

    // Active filter
    if (activeParam === 'true') {
      baseQuery = baseQuery.eq('is_active', true)
    }

    // Text search (name, subdomain, plan_type)
    // Note: Using ilike requires separate filters; Supabase doesn't support OR across columns directly in one call
    if (q) {
      baseQuery = baseQuery.or(`name.ilike.%${q}%,subdomain.ilike.%${q}%,plan_type.ilike.%${q}%`)
    }

    // Order
    baseQuery = baseQuery.order(orderBy, { ascending: orderDir === 'asc' })

    // Pagination
    const { data, error, count } = await baseQuery.range(from, to)
    if (error) {
      throw error
    }

    const companies = (data || []).map((company: any) => ({
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      plan_type: company.plan_type,
      is_active: company.is_active,
      created_at: company.created_at,
      employee_count: company.employees?.[0]?.count || 0
    }))

    return res.status(200).json({
      success: true,
      companies,
      metadata: {
        total: count ?? companies.length,
        page,
        pageSize
      }
    })
  } catch (err) {
    logger.error('Error in companies-improved', err)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
