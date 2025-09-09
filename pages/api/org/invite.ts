import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/auth/requireUser'
import { sendInviteEmail } from '../../../lib/emails/invite'
import { auditInviteSent } from '../../../lib/audit'
import { randomBytes } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, user, userProfile } = await requireAdmin(req, res)
    const { email, role = 'employee' } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!['employee', 'manager', 'hr_manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const company_id = userProfile.company_id

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('company_id', company_id)
      .eq('user_id', email) // Assuming email is used as user_id for invites
      .single()

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this organization' })
    }

    // Check if there's already a pending invite
    const { data: existingInvite } = await supabase
      .from('organization_invites')
      .select('id')
      .eq('company_id', company_id)
      .eq('email', email)
      .is('accepted_at', null)
      .single()

    if (existingInvite) {
      return res.status(400).json({ error: 'Invite already sent to this email' })
    }

    // Generate invite token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days to accept

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        company_id,
        email,
        role,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      return res.status(500).json({ error: 'Failed to create invite' })
    }

    // Send invite email
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/api/org/accept?token=${token}`
      await sendInviteEmail({
        to: email,
        inviteUrl,
        companyName: userProfile.company_name || 'your organization',
        role
      })
    } catch (emailError) {
      console.warn('Failed to send invite email:', emailError)
      // Don't fail the request if email fails
    }

    // Log audit event
    try {
      await auditInviteSent(supabase, user.id, company_id, email)
    } catch (auditError) {
      console.warn('Failed to log audit event:', auditError)
      // Don't fail the request if audit fails
    }

    return res.status(200).json({
      success: true,
      invite_id: invite.id,
      message: 'Invite sent successfully'
    })

  } catch (error: any) {
    console.error('Invite error:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    if (error.message === 'ADMIN_REQUIRED') {
      return res.status(403).json({ error: 'Admin privileges required' })
    }

    return res.status(400).json({ error: error.message || 'Failed to send invite' })
  }
}
