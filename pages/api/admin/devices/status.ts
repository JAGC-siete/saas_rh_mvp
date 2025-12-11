import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createAdminClient } from '../../../../lib/supabase/server';
import { HikvisionSDK } from '../../../../lib/hikvision/sdk';

/**
 * Get device status using integrated Hikvision SDK.
 * This endpoint uses the SDK directly instead of calling a separate proxy service.
 */
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

    // Fetch device credentials from the database
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('ip_address, port, username, password_encrypted, status, last_sync_at')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Use integrated SDK to get device status
    const hikvisionClient = new HikvisionSDK({
      host: device.ip_address,
      port: device.port,
      user: device.username,
      pass: device.password_encrypted,
    });

    try {
      const systemInfo = await hikvisionClient.getSystemInfo();
      
      // Update device status in DB
      const isOnline = !!systemInfo;
      await supabaseAdmin
        .from('devices')
        .update({ 
          status: isOnline ? 'online' : 'offline',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', deviceId);

      return res.status(200).json({
        deviceId,
        status: isOnline ? 'online' : 'offline',
        lastSyncAt: new Date().toISOString(),
        systemInfo: systemInfo ? {
          deviceName: systemInfo.deviceName,
          model: systemInfo.model,
        } : null,
      });
    } catch (deviceError) {
      // Device is offline or unreachable
      await supabaseAdmin
        .from('devices')
        .update({ 
          status: 'offline',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', deviceId);

      return res.status(200).json({
        deviceId,
        status: 'offline',
        lastSyncAt: new Date().toISOString(),
        error: 'Device unreachable',
      });
    }

  } catch (error: any) {
    console.error('[SaaS API] Error in device status endpoint:', error);
    return res.status(500).json({ 
      error: 'An internal server error occurred',
      details: error.message,
    });
  }
}
