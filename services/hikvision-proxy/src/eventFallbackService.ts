import { supabase } from './supabaseClient';
import { HikvisionISAPI } from './hikvision-isapi.mock';

const POLLING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const DEVICE_INACTIVE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// Concurrency control: A set to track which devices are currently being polled.
const pollingInProgress = new Set<string>();

async function performEventFallback() {
  console.log('[Fallback] Starting intelligent event fallback poll...');

  const inactiveThreshold = new Date(Date.now() - DEVICE_INACTIVE_THRESHOLD_MS).toISOString();

  // Find devices that are marked as offline AND haven't been successfully synced recently.
  const { data: devices, error } = await supabase
    .from('devices')
    .select('id, name, ip_address, port, username, password_encrypted')
    .eq('status', 'offline')
    .lt('last_sync_at', inactiveThreshold);

  if (error) {
    console.error('[Fallback] CRITICAL: Could not fetch inactive devices from database.', error);
    return;
  }

  if (!devices || devices.length === 0) {
    console.log('[Fallback] No devices require event fallback at this time.');
    return;
  }

  console.log(`[Fallback] Found ${devices.length} inactive devices that need polling.`);

  for (const device of devices) {
    // Concurrency Check: Skip if a polling operation for this device is already in progress.
    if (pollingInProgress.has(device.id)) {
      console.log(`[Fallback] Polling for device ${device.name} is already in progress. Skipping.`);
      continue;
    }

    try {
      // Add device to the set to lock it.
      pollingInProgress.add(device.id);
      console.log(`[Fallback] -> Starting event poll for device ${device.name} (${device.ip_address})`);

      // In a real scenario, decrypt the password.
      const decryptedPassword = `decrypted-${device.password_encrypted}`;

      const hikvisionClient = new HikvisionISAPI({
        host: device.ip_address,
        port: device.port,
        user: device.username,
        pass: decryptedPassword,
        timeout: 30000, // Longer timeout for event polling
      });

      // In a real implementation, we would store and use the last event's timestamp or ID (`searchAfter`).
      // For this mock, we'll just simulate fetching recent events.
      // const lastEventId = await getLastEventIdFromDb(device.id);

      // const { data: events } = await hikvisionClient.Event.searchEvents({ searchAfter: lastEventId });
      console.log(`[Fallback] -> Mock polling events for device ${device.name}...`);

      // TODO: Process the fetched events and insert them into the main SaaS database.
      // For now, we'll just log a success message.
      console.log(`[Fallback] -> Successfully polled events for device ${device.name}.`);

    } catch (e: any) {
      console.error(`[Fallback] -> FAILED to poll events for device ${device.name}. Error: ${e.message}`);
    } finally {
      // IMPORTANT: Remove device from the set to unlock it, allowing it to be polled in the next cycle.
      pollingInProgress.delete(device.id);
    }
  }
}

/**
 * Starts the background service that intelligently polls inactive devices for missed events.
 */
export function startEventFallbackService() {
  console.log('[Fallback] Intelligent Event Fallback Service has been initialized.');
  // Run the poll immediately on start, then set the interval.
  performEventFallback();
  setInterval(performEventFallback, POLLING_INTERVAL_MS);
}
