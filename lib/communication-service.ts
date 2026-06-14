import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function sendMassCommunication(campaignId: string, recipients: {id: string, email: string}[]) {
  const { data: campaign, error: campaignError } = await supabase
    .from('communication_campaigns')
    .select('subject, body')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) throw new Error('Campaign not found');

  const results = {
    success: 0,
    failed: 0,
    logs: [] as any[]
  };

  // Batch processing to avoid Resend rate limits
  for (const user of recipients) {
    try {
      await resend.emails.send({
        from: 'Sisu Steward <notifications@humanosisu.net>',
        to: user.email,
        subject: campaign.subject,
        html: campaign.body,
      });

      await supabase.from('communication_recipients').insert({
        campaign_id: campaignId,
        user_id: user.id,
        email: user.email,
        status: 'delivered'
      });
      
      results.success++;
    } catch (e: any) {
      await supabase.from('communication_recipients').insert({
        campaign_id: campaignId,
        user_id: user.id,
        email: user.email,
        status: 'failed',
        error_message: e.message
      });
      results.failed++;
    }
  }

  return results;
}
