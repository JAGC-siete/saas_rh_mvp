import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createSecureErrorResponse } from '../../../../lib/security/error-handling'

interface PaymentsResponse {
  success: boolean
  data?: any
  metadata?: {
    total?: number
    page?: number
    pageSize?: number
    filters?: any
  }
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentsResponse>
) {
  try {
    // Verify super admin
    const { user } = await requireSuperAdmin(req, res)

    switch (req.method) {
      case 'GET':
        return await getPayments(req, res)
      case 'POST':
        return await createPayment(req, res, user.id)
      case 'PATCH':
        return await updatePayment(req, res)
      case 'DELETE':
        return await deletePayment(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          message: `Method ${req.method} not allowed`
        })
    }
  } catch (error: any) {
    // If error from requireSuperAdmin, it already sent response
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in payments admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getPayments(req: NextApiRequest, res: NextApiResponse<PaymentsResponse>) {
  try {
    const adminClient = createAdminClient()

    // Query params for filtering
    const companyId = req.query.company_id as string | undefined
    const startDate = req.query.start_date as string | undefined
    const endDate = req.query.end_date as string | undefined
    const minAmount = req.query.min_amount as string | undefined
    const maxAmount = req.query.max_amount as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query
    let query = adminClient
      .from('manual_payments')
      .select(`
        id,
        company_id,
        amount_hnl,
        reference,
        paid_at,
        created_by,
        companies (
          id,
          name
        )
      `, { count: 'exact' })

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (startDate) {
      query = query.gte('paid_at', startDate)
    }

    if (endDate) {
      query = query.lte('paid_at', endDate)
    }

    if (minAmount) {
      query = query.gte('amount_hnl', parseFloat(minAmount))
    }

    if (maxAmount) {
      query = query.lte('amount_hnl', parseFloat(maxAmount))
    }

    // Order and paginate
    query = query.order('paid_at', { ascending: false }).range(from, to)

    const { data: payments, error, count } = await query

    if (error) {
      throw error
    }

    // Get creator emails
    const creatorIds = payments ? [...new Set(payments.map((p: any) => p.created_by).filter(Boolean))] : []
    const creatorsMap = new Map<string, string>()

    if (creatorIds.length > 0) {
      try {
        const { data: authUsers } = await adminClient.auth.admin.listUsers()
        authUsers?.users?.forEach((user: any) => {
          if (creatorIds.includes(user.id)) {
            creatorsMap.set(user.id, user.email || 'Unknown')
          }
        })
      } catch (authError: any) {
        logger.warn('Error fetching creator emails', { error: authError?.message })
      }
    }

    // Format response
    const paymentsFormatted = payments?.map((payment: any) => ({
      id: payment.id,
      company_id: payment.company_id,
      company_name: payment.companies?.name || 'Unknown',
      amount_hnl: parseFloat(payment.amount_hnl),
      reference: payment.reference,
      paid_at: payment.paid_at,
      created_by: payment.created_by,
      created_by_email: creatorsMap.get(payment.created_by) || 'Unknown'
    })) || []

    logger.info('Payments retrieved', {
      count: paymentsFormatted.length,
      total: count,
      filters: { companyId, startDate, endDate }
    })

    return res.status(200).json({
      success: true,
      data: paymentsFormatted,
      metadata: {
        total: count || 0,
        page,
        pageSize,
        filters: {
          company_id: companyId || null,
          start_date: startDate || null,
          end_date: endDate || null,
          min_amount: minAmount || null,
          max_amount: maxAmount || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching payments', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function createPayment(
  req: NextApiRequest,
  res: NextApiResponse<PaymentsResponse>,
  userId: string
) {
  try {
    const adminClient = createAdminClient()
    const { company_id, amount_hnl, reference, paid_at } = req.body

    // Validate required fields
    if (!company_id || !amount_hnl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'company_id and amount_hnl are required'
      })
    }

    // Validate amount
    const amount = parseFloat(amount_hnl)
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      })
    }

    // Verify company exists
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('id, name, is_active')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
        message: 'The specified company does not exist'
      })
    }

    // Create payment
    const { data: payment, error: paymentError } = await adminClient
      .from('manual_payments')
      .insert({
        company_id,
        amount_hnl: amount,
        reference: reference || `Payment by super admin`,
        paid_at: paid_at || new Date().toISOString(),
        created_by: userId
      })
      .select()
      .single()

    if (paymentError) {
      throw paymentError
    }

    logger.info('Payment created', {
      paymentId: payment.id,
      companyId: company_id,
      amount,
      userId
    })

    return res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: {
        ...payment,
        company_name: company.name
      }
    })
  } catch (error) {
    logger.error('Error creating payment', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function updatePayment(req: NextApiRequest, res: NextApiResponse<PaymentsResponse>) {
  try {
    const adminClient = createAdminClient()
    const { id, amount_hnl, reference, paid_at } = req.body

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment ID',
        message: 'Payment ID is required'
      })
    }

    // Build update object
    const updates: any = {}
    if (amount_hnl !== undefined) {
      const amount = parseFloat(amount_hnl)
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount',
          message: 'Amount must be a positive number'
        })
      }
      updates.amount_hnl = amount
    }
    if (reference !== undefined) updates.reference = reference
    if (paid_at !== undefined) updates.paid_at = paid_at

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided',
        message: 'At least one field must be updated'
      })
    }

    // Update payment
    const { data: payment, error: updateError } = await adminClient
      .from('manual_payments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
          message: 'The specified payment does not exist'
        })
      }
      throw updateError
    }

    logger.info('Payment updated', {
      paymentId: id,
      updates
    })

    return res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        ...payment,
        company_name: payment.companies?.name || 'Unknown'
      }
    })
  } catch (error) {
    logger.error('Error updating payment', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function deletePayment(req: NextApiRequest, res: NextApiResponse<PaymentsResponse>) {
  try {
    const adminClient = createAdminClient()
    const { id } = req.query

    // Validate ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing payment ID',
        message: 'Payment ID is required'
      })
    }

    // Delete payment
    const { error: deleteError } = await adminClient
      .from('manual_payments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    logger.info('Payment deleted', {
      paymentId: id
    })

    return res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting payment', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

