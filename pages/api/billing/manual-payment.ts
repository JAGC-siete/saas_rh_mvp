import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'
import { audit } from '../../../lib/audit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, user, userProfile } = await requireUser(req, res)
    const { company_id, amount_hnl, plan = 'basic', reference } = req.body

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

    // Record manual payment
    const { data: payment, error: paymentError } = await supabase
      .from('manual_payments')
      .insert({
        company_id,
        amount_hnl: amount,
        reference: reference || `Manual payment by ${user.email}`,
        created_by: user.id
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error recording manual payment:', paymentError)
      return res.status(500).json({ error: 'Failed to record payment' })
    }

    // Update subscription status to active
    const { error: subError } = await supabase
      .from('company_subscriptions')
      .upsert({
        company_id,
        status: 'active',
        plan,
        trial_start: new Date().toISOString(),
        trial_end: new Date().toISOString() // End trial when payment is made
      }, { 
        onConflict: 'company_id',
        ignoreDuplicates: false
      })

    if (subError) {
      console.error('Error updating subscription:', subError)
      return res.status(500).json({ error: 'Failed to update subscription' })
    }

    // Log audit event
    try {
      await audit(supabase, {
        user_id: user.id,
        company_id,
        event: 'manual_payment_recorded',
        meta: { 
          amount_hnl: amount, 
          plan, 
          payment_id: payment.id,
          reference: payment.reference
        }
      })
    } catch (auditError) {
      console.warn('Failed to log audit event:', auditError)
      // Don't fail the request if audit fails
    }

    return res.status(200).json({ 
      success: true, 
      payment_id: payment.id,
      message: 'Payment recorded and subscription activated successfully'
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
