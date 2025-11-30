import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../lib/supabase/server';

/**
 * Get the status of a specific Hikvision device.
 * Returns the last known status from the database.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { deviceId } = req.query;

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  console.log(`[Hikvision Proxy] Received status request for device ${deviceId}`);

  try {
    const supabase = createAdminClient();

    const { data: device, error } = await supabase
      .from('devices')
      .select('id, name, status, last_sync_at, last_event_at, ip_address, webhook_url')
      .eq('id', deviceId)
      .single();

    if (error || !device) {
      if (error?.code === 'PGRST116') {
        return res.status(404).json({ error: 'Device not found' });
      }
      console.error(`[Hikvision Proxy] Error fetching device status: ${deviceId}`, error);
      return res.status(500).json({ error: 'Internal server error while fetching device status.' });
    }

    console.log(`[Hikvision Proxy] Returning stored status for device ${deviceId}: ${device.status}`);

    return res.status(200).json(device);

  } catch (err: any) {
    console.error(`[Hikvision Proxy] An unexpected error occurred during status check for device ${deviceId}`, err);
    res.status(500).json({ error: 'Internal server error occurred.' });
  }
}

