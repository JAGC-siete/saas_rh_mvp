import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../lib/supabase/server';
import { HikvisionSDK } from '../../../lib/hikvision/sdk';

/**
 * Provision a Hikvision device by configuring its webhook URL.
 * This endpoint is called internally by the SaaS application.
 * 
 * Based on Hikvision ISAPI manual:
 * - Client software/system must handle Digest Authentication
 * - Must configure httpHosts for event notifications
 * - Must expose stable HTTP server for webhooks
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { deviceId, webhookUrl } = req.body;

  if (!deviceId || !webhookUrl) {
    return res.status(400).json({ error: 'deviceId and webhookUrl are required' });
  }

  console.log(`[Hikvision Proxy] Received provisioning request for device ${deviceId}`);

  try {
    const supabase = createAdminClient();

    // 1. Fetch device credentials from the database
    const { data: device, error } = await supabase
      .from('devices')
      .select('ip_address, port, username, password_encrypted')
      .eq('id', deviceId)
      .single();

    if (error || !device) {
      console.error(`[Hikvision Proxy] Device not found in DB for ID: ${deviceId}`, error);
      return res.status(404).json({ error: 'Device not found' });
    }

    // IMPORTANT: The password is currently stored in plain text in the database.
    // In a real scenario, password_encrypted would be a reference to a secret
    // in a vault (like Supabase Vault), and we would use a Supabase Edge Function
    // or similar secure method to retrieve the actual password.
    console.warn(`[Hikvision Proxy] SECURITY WARNING: In a real implementation, the password must be retrieved from a secure vault.`);
    const password = device.password_encrypted;

    console.log(`[Hikvision Proxy] Found device: ${device.ip_address}:${device.port}`);

    // 2. Use the Hikvision SDK to connect and configure
    const hikvisionClient = new HikvisionSDK({
      host: device.ip_address,
      port: device.port,
      user: device.username,
      pass: password,
    });

    console.log(`[Hikvision Proxy] Connecting to device at ${device.ip_address}...`);

    // 3. Test connection and get system info
    const systemInfo = await hikvisionClient.getSystemInfo();

    if (!systemInfo) {
      console.error(`[Hikvision Proxy] Failed to connect to device ${deviceId}`);
      return res.status(500).json({
        message: 'Failed to provision device',
        error: 'Could not establish connection with the device.',
      });
    }

    console.log(`[Hikvision Proxy] Successfully connected to device ${deviceId}`);

    // 4. Configure HTTP notification server (httpHosts) on the device
    console.log(`[Hikvision Proxy] Configuring webhook URL on device: ${webhookUrl}`);
    const notificationResult = await hikvisionClient.setNotificationServer({
      webhookUrl: webhookUrl,
      hostId: '1',
    });

    if (!notificationResult.success) {
      console.error(`[Hikvision Proxy] Failed to configure notification server:`, notificationResult.error);
      
      // Update device status with error
      await supabase
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
        message: 'Failed to configure notification server on device',
        error: notificationResult.error || 'Unknown error configuring webhook',
        deviceId,
      });
    }

    console.log(`[Hikvision Proxy] Successfully configured notification server. Test result:`, notificationResult.testResult);

    // 5. Update device status in DB with webhook configuration details
    await supabase
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
    
    res.status(200).json({
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

  } catch (err: any) {
    console.error(`[Hikvision Proxy] An unexpected error occurred during provisioning for device ${deviceId}`, err);
    res.status(500).json({ 
      error: 'An internal server error occurred.',
      details: err.message,
    });
  }
}

