import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { sendTrialReminderEmail } from '../../../lib/emails/trial-reminder'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is a CRON request
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()

    console.log('🕐 Running daily CRON job...')

    // 1. Send trial reminders
    await sendTrialReminders(supabase, now)

    // 2. Close expired trials
    await closeExpiredTrials(supabase, now)

    // 3. Clean up expired invites
    await cleanupExpiredInvites(supabase, now)

    console.log('✅ Daily CRON job completed successfully')

    return res.status(200).json({
      success: true,
      message: 'Daily CRON job completed',
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('❌ Daily CRON job failed:', error)
    return res.status(500).json({
      success: false,
      error: 'CRON job failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function sendTrialReminders(supabase: any, now: Date) {
  console.log('📧 Checking for trial reminders...')

  // Find trials expiring in 3, 7, or 14 days
  const reminderDays = [3, 7, 14]
  
  for (const days of reminderDays) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + days)
    const targetDateStr = targetDate.toISOString().split('T')[0]

    const { data: trials, error } = await supabase
      .from('company_subscriptions')
      .select(`
        *,
        companies!inner(name, id)
      `)
      .eq('status', 'trial')
      .gte('trial_end', targetDateStr)
      .lt('trial_end', new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    if (error) {
      console.error(`Error fetching trials expiring in ${days} days:`, error)
      continue
    }

    if (trials && trials.length > 0) {
      console.log(`📧 Found ${trials.length} trials expiring in ${days} days`)
      
      for (const trial of trials) {
        try {
          // Get company admin email
          const { data: admin } = await supabase
            .from('user_profiles')
            .select('auth.users!inner(email)')
            .eq('company_id', trial.company_id)
            .in('role', ['company_admin', 'super_admin'])
            .limit(1)
            .single()

          if (admin?.auth?.users?.email) {
            await sendTrialReminderEmail({
              to: admin.auth.users.email,
              companyName: trial.companies.name,
              daysRemaining: days,
              trialEnd: trial.trial_end
            })
          }
        } catch (emailError) {
          console.warn(`Failed to send reminder for trial ${trial.id}:`, emailError)
        }
      }
    }
  }
}

async function closeExpiredTrials(supabase: any, now: Date) {
  console.log('⏰ Closing expired trials...')

  const { data: expiredTrials, error } = await supabase
    .from('company_subscriptions')
    .select('id, company_id')
    .eq('status', 'trial')
    .lt('trial_end', now.toISOString())

  if (error) {
    console.error('Error fetching expired trials:', error)
    return
  }

  if (expiredTrials && expiredTrials.length > 0) {
    console.log(`⏰ Found ${expiredTrials.length} expired trials`)

    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update({ status: 'canceled' })
      .eq('status', 'trial')
      .lt('trial_end', now.toISOString())

    if (updateError) {
      console.error('Error closing expired trials:', updateError)
    } else {
      console.log(`✅ Closed ${expiredTrials.length} expired trials`)
    }
  }
}

async function cleanupExpiredInvites(supabase: any, now: Date) {
  console.log('🧹 Cleaning up expired invites...')

  const { error } = await supabase
    .from('organization_invites')
    .delete()
    .lt('expires_at', now.toISOString())
    .is('accepted_at', null)

  if (error) {
    console.error('Error cleaning up expired invites:', error)
  } else {
    console.log('✅ Cleaned up expired invites')
  }
}
