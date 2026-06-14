import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendMassCommunication } from '@/lib/communication-service';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Security Gate: Only Super Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Verify super_admin role (Assuming role is stored in a profiles table or JWT)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden: Super Admin only' });

  try {
    const { subject, body, segment } = req.body;

    // 2. Create Campaign Record
    const { data: campaign, error: campaignError } = await supabase
      .from('communication_campaigns')
      .insert({ subject, body, target_segment: segment, status: 'sending', created_by: user.id })
      .select()
      .single();

    if (campaignError || !campaign) throw new Error('Failed to create campaign');

    // 3. Segment Audience
    let query = supabase.from('profiles').select('id, email');
    
    if (segment === 'new_admins') {
      // New admins: joined in the last 7 days
      query = query.filter('created_at', 'gte', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    } else if (segment === 'active_admins') {
      query = query.eq('role', 'company_admin');
    }

    const { data: recipients, error: recError } = await query;
    if (recError || !recipients) throw new Error('Failed to fetch recipients');

    // 4. Execute Sending (Async processing)
    // We don't 'await' the full batch here to avoid timeout; we trigger it.
    sendMassCommunication(campaign.id, recipients)
      .then(results => {
        supabase.from('communication_campaigns').update({ status: 'sent' }).eq('id', campaign.id);
      })
      .catch(err => {
        supabase.from('communication_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
        console.error('Mass communication failure:', err);
      });

    return res.status(200).json({ 
      message: 'Campaign triggered successfully', 
      campaignId: campaign.id, 
      recipientCount: recipients.length 
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
