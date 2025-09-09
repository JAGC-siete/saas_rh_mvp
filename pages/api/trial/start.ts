import { NextApiRequest, NextApiResponse } from 'next'
import { addDays } from 'date-fns'
import { requireUser } from '../../../lib/auth/requireUser'
import { sendTrialStartedEmail } from '../../../lib/emails/trial'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, user, userProfile } = await requireUser(req, res)
    const { company_id } = req.body

    // Use company_id from request or user's profile
    const targetCompanyId = company_id || userProfile?.company_id

    if (!targetCompanyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Verify user has access to this company
    if (userProfile?.company_id !== targetCompanyId && userProfile?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied to this company' })
    }

    // Create or update trial subscription (idempotent)
    const trialEnd = addDays(new Date(), 30)
    
    const { error: subError } = await supabase
      .from('company_subscriptions')
      .upsert({
        company_id: targetCompanyId,
        status: 'trial',
        plan: 'basic',
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString()
      }, { 
        onConflict: 'company_id',
        ignoreDuplicates: false
      })

    if (subError) {
      console.error('Error creating trial subscription:', subError)
      return res.status(500).json({ error: 'Failed to start trial' })
    }

    // Send trial started email
    try {
      await sendTrialStartedEmail({
        to: user.email!,
        company_id: targetCompanyId,
        trialEnd: trialEnd.toISOString()
      })
    } catch (emailError) {
      console.warn('Failed to send trial started email:', emailError)
      // Don't fail the request if email fails
    }

    return res.status(200).json({ 
      success: true, 
      trialEnd: trialEnd.toISOString(),
      message: 'Trial started successfully'
    })

  } catch (error: any) {
    console.error('Trial start error:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }

    return res.status(400).json({ error: error.message || 'Failed to start trial' })
  }
}
