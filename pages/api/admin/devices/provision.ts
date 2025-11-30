import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createAdminClient } from '../../../../lib/supabase/server';

// The URL of the Hikvision Proxy Service.
// This should be an environment variable in a real deployment.
const PROXY_SERVICE_URL = process.env.HIKVISION_PROXY_URL || 'http://localhost:3001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    // 1. Authentication and Authorization
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabaseAdmin = createAdminClient();
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', session.user.id)
      .single();

    if (userProfile?.role !== 'company_admin' && userProfile?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // 2. Construct the full webhook URL for the device
    // The device needs to know which company its events belong to.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/attendance?company_id=${userProfile.company_id}`;

    // 3. Call the Hikvision Proxy Service
    console.log(`[SaaS API] Calling proxy service for device ${deviceId} with webhook ${webhookUrl}`);
    const proxyResponse = await fetch(`${PROXY_SERVICE_URL}/api/v1/hik/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId, webhookUrl }),
    });

    const proxyData = await proxyResponse.json();

    if (!proxyResponse.ok) {
      console.error(`[SaaS API] Error from proxy service:`, proxyData);
      return res.status(proxyResponse.status).json({
        error: 'Failed to provision device via proxy',
        proxyError: proxyData.error,
      });
    }

    // 4. Return the successful response from the proxy
    return res.status(200).json(proxyData);

  } catch (error) {
    console.error('[SaaS API] Error in provision endpoint:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
}
