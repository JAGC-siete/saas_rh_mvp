import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createAdminClient } from '../../../../lib/supabase/server';

const PROXY_SERVICE_URL = process.env.HIKVISION_PROXY_URL || 'http://localhost:3001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabaseAdmin = createAdminClient();
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userProfile?.role !== 'company_admin' && userProfile?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    const { deviceId } = req.query;
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId is required in the query' });
    }

    const proxyResponse = await fetch(`${PROXY_SERVICE_URL}/api/v1/devices/${deviceId}/status`);
    const proxyData = await proxyResponse.json();

    if (!proxyResponse.ok) {
      return res.status(proxyResponse.status).json({
        error: 'Failed to get device status from proxy',
        proxyError: proxyData.error,
      });
    }

    return res.status(200).json(proxyData);

  } catch (error) {
    console.error('[SaaS API] Error in device status endpoint:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
}
