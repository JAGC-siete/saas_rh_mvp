import { supabase } from './supabaseClient';
import { HikvisionISAPI } from './hikvision-isapi.mock';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function performHealthCheck() {
  console.log('[HealthCheck] Starting periodic health check for all active devices...');

  const { data: devices, error } = await supabase
    .from('devices')
    .select('id, ip_address, port, username, password_encrypted, name')
    .eq('is_active', true);

  if (error) {
    console.error('[HealthCheck] CRITICAL: Could not fetch devices from database.', error);
    return;
  }

  if (!devices || devices.length === 0) {
    console.log('[HealthCheck] No active devices found to check.');
    return;
  }

  console.log(`[HealthCheck] Found ${devices.length} active devices. Pinging each one.`);

  for (const device of devices) {
    let currentStatus: 'online' | 'offline' = 'offline';
    try {
      // In a real scenario, we would decrypt this password.
      const decryptedPassword = `decrypted-${device.password_encrypted}`;
      
      const hikvisionClient = new HikvisionISAPI({
        host: device.ip_address,
        port: device.port,
        user: device.username,
        pass: decryptedPassword,
        timeout: 5000, // 5-second timeout for health checks
      });

      // A lightweight call to check if the device is responsive.
      const result = await hikvisionClient.System.getSystemInfo();

      if (result.success) {
        currentStatus = 'online';
      }
    } catch (e: any) {
      // Errors are expected for offline devices. We log it for debugging but don't treat it as a system crisis.
      console.log(`[HealthCheck] Device ${device.name} (${device.ip_address}) appears to be offline. Error: ${e.message}`);
    }

    // Update the device status in the database
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        status: currentStatus,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    if (updateError) {
      console.error(`[HealthCheck] Failed to update status for device ${device.name}`, updateError);
    } else {
      console.log(`[HealthCheck] Device ${device.name} status updated to: ${currentStatus}`);
    }
  }
}

/**
 * Starts the background service that periodically checks the health of all registered devices.
 */
export function startHealthCheckService() {
  console.log('[HealthCheck] Health Check Service has been initialized.');
  // Run the check immediately on start, then set the interval.
  performHealthCheck();
  setInterval(performHealthCheck, CHECK_INTERVAL_MS);
}
