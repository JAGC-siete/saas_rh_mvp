import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, user } = await requireUser(req, res)
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    // Find valid invite
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .eq('email', user.email)
      .is('accepted_at', null)
      .single()

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invalid or expired invite' })
    }

    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('company_id', invite.company_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this organization' })
    }

    // Create organization membership
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        company_id: invite.company_id,
        user_id: user.id,
        role: invite.role
      })

    if (memberError) {
      console.error('Error creating membership:', memberError)
      return res.status(500).json({ error: 'Failed to join organization' })
    }

    // Update user profile with company_id and role
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        company_id: invite.company_id,
        role: invite.role,
        is_active: true
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false
      })

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      // Don't fail the request if profile update fails
    }

    // Mark invite as accepted
    const { error: acceptError } = await supabase
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (acceptError) {
      console.warn('Failed to mark invite as accepted:', acceptError)
      // Don't fail the request if this fails
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully joined organization',
      company_id: invite.company_id,
      role: invite.role
    })

  } catch (error: any) {
    console.error('Accept invite error:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(400).json({ error: error.message || 'Failed to accept invite' })
  }
}
