import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/server';
import { HikvisionSDK } from '../../../../lib/hikvision/sdk';

/**
 * Provision a Hikvision device.
 * This endpoint handles authentication/authorization and then calls
 * the internal Hikvision proxy functionality.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Authentication and Authorization
    const supabaseAdmin = createAdminClient();
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
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
    // Use fallback chain: NEXT_PUBLIC_SITE_URL -> RAILWAY_PUBLIC_DOMAIN -> production domain
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.RAILWAY_PUBLIC_DOMAIN || 
                    'https://humanosisu.net';
    
    // Validate that baseUrl is a proper URL (not localhost in production)
    if (baseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.error('[SaaS API] CRITICAL: NEXT_PUBLIC_SITE_URL is localhost in production!');
      return res.status(500).json({ 
        error: 'Configuration error: NEXT_PUBLIC_SITE_URL must be set to a public domain in production' 
      });
    }
    
    const webhookUrl = `${baseUrl}/api/webhooks/attendance?company_id=${userProfile.company_id}`;
    console.log(`[SaaS API] Constructed webhook URL: ${webhookUrl}`);

    // 3. Call internal Hikvision proxy functionality
    console.log(`[SaaS API] Provisioning device ${deviceId} with webhook ${webhookUrl}`);

    // Fetch device credentials from the database
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('ip_address, port, username, password_encrypted')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      console.error(`[SaaS API] Device not found: ${deviceId}`, deviceError);
      return res.status(404).json({ error: 'Device not found' });
    }

    // IMPORTANT: The password is currently stored in plain text in the database.
    // In a real scenario, password_encrypted would be retrieved from a secure vault.
    const password = device.password_encrypted;

    // Create Hikvision SDK client and test connection
    const hikvisionClient = new HikvisionSDK({
      host: device.ip_address,
      port: device.port,
      user: device.username,
      pass: password,
    });

    console.log(`[SaaS API] Connecting to device at ${device.ip_address}:${device.port}...`);

    // Test connection and get system info
    const systemInfo = await hikvisionClient.getSystemInfo();

    if (!systemInfo) {
      console.error(`[SaaS API] Failed to connect to device ${deviceId}`);
      return res.status(500).json({
        error: 'Failed to provision device',
        message: 'Could not establish connection with the device.',
      });
    }

    console.log(`[SaaS API] Successfully connected to device ${deviceId}`);

    // Configure HTTP notification server (httpHosts) on the device
    console.log(`[SaaS API] Configuring webhook URL on device: ${webhookUrl}`);
    const notificationResult = await hikvisionClient.setNotificationServer({
      webhookUrl: webhookUrl,
      hostId: '1',
    });

    if (!notificationResult.success) {
      console.error(`[SaaS API] Failed to configure notification server:`, notificationResult.error);
      
      // Update device status with error
      await supabaseAdmin
        .from('devices')
        .update({ 
          status: 'error', 
          last_sync_at: new Date().toISOString(),
          webhook_url: webhookUrl,
          webhook_configured: false,
          last_webhook_test_at: new Date().toISOString(),
          webhook_test_result: { error: notificationResult.error },
        })
        .eq('id', deviceId);

      return res.status(500).json({
        error: 'Failed to configure notification server on device',
        message: notificationResult.error || 'Unknown error configuring webhook',
        deviceId,
      });
    }

    console.log(`[SaaS API] Successfully configured notification server. Test result:`, notificationResult.testResult);

    // Update device status in DB with webhook configuration details
    await supabaseAdmin
      .from('devices')
      .update({ 
        status: 'online', 
        last_sync_at: new Date().toISOString(),
        webhook_url: webhookUrl,
        http_host_id: '1',
        webhook_configured: true,
        last_webhook_test_at: new Date().toISOString(),
        webhook_test_result: notificationResult.testResult ? { result: notificationResult.testResult } : null,
      })
      .eq('id', deviceId);

    console.log(`[SaaS API] Successfully provisioned device ${deviceId}`);

    return res.status(200).json({
      message: 'Device provisioned successfully',
      deviceId,
      webhookUrl,
      systemInfo: {
        deviceName: systemInfo.deviceName,
        model: systemInfo.model,
      },
      notificationConfigured: true,
      testResult: notificationResult.testResult,
    });

  } catch (error: any) {
    console.error('[SaaS API] Error in provision endpoint:', error);
    return res.status(500).json({ 
      error: 'An internal server error occurred',
      details: error.message,
    });
  }
}
