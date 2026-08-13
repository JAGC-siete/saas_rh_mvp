import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'
import { createAdminClient } from '../../../lib/supabase/server'
import { activateFromQuote } from '../../../lib/billing/activate-from-quote'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user, userProfile } = await requireUser(req, res)
    const { company_id, amount_hnl, plan = 'basic', reference, quote_id, payment_kind } = req.body

    // Validate required fields
    if (!company_id || !amount_hnl) {
      return res.status(400).json({ error: 'Company ID and amount are required' })
    }

    // Verify user has access to this company
    if (userProfile?.company_id !== company_id && userProfile?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied to this company' })
    }

    // Validate amount
    const amount = parseFloat(amount_hnl)
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const adminClient = createAdminClient()
    const defaultReference =
      reference ||
      (quote_id
        ? `Cotización ${String(quote_id).slice(0, 8)} — 50% anticipo`
        : `Manual payment by ${user.email}`)

    let activation
    try {
      activation = await activateFromQuote(adminClient, {
        companyId: company_id,
        amountHnl: amount,
        reference: defaultReference,
        createdBy: user.id,
        quoteId: quote_id || null,
        paymentKind: payment_kind || 'deposit',
        planType: plan,
      })
    } catch (activationError: any) {
      const msg = activationError?.message || 'ACTIVATION_FAILED'
      if (msg === 'QUOTE_NOT_FOUND') {
        return res.status(404).json({ error: 'No hay cotización enviada vinculada a esta empresa' })
      }
      console.error('Manual payment activation error:', activationError)
      return res.status(500).json({ error: 'Failed to record payment' })
    }

    return res.status(200).json({
      success: true,
      payment_id: activation.payment_id,
      quote_id: activation.quote_id,
      activated: activation.activated,
      plan_type: activation.plan_type,
      message: activation.activated
        ? 'Payment recorded and subscription activated successfully'
        : 'Payment recorded (deposit below activation threshold)',
    })
  } catch (error: any) {
    console.error('Manual payment error:', error)

    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }

    return res.status(400).json({ error: error.message || 'Failed to record payment' })
  }
}
