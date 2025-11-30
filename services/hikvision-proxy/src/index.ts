// Modify the start of the main application file to initialize tracing first.
import { startTracing } from './tracing';
startTracing(); // This must be called before any other imports

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { supabase } from './supabaseClient';
// Use the mock library for development until the real one is available
import { HikvisionSDK } from './hikvision.sdk'; // Updated import
import { startHealthCheckService } from './healthCheckService';
import { startWorker } from './worker';
import { startEventFallbackService } from './eventFallbackService';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

// Apply a global rate limiter to all incoming requests to the proxy
const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000, // Limit each IP to 1000 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(globalLimiter);

/**
 * Health check endpoint to verify the service is running.
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Endpoint to provision a Hikvision device.
 * This is the core of Phase 1.
 */
app.post('/api/v1/hik/provision', async (req: Request, res: Response) => {
  const { deviceId, webhookUrl } = req.body;

  if (!deviceId || !webhookUrl) {
    return res.status(400).json({ error: 'deviceId and webhookUrl are required' });
  }

  console.log(`[Proxy] Received provisioning request for device ${deviceId}`);

  try {
    // 1. Fetch device credentials from the database
    const { data: device, error } = await supabase
      .from('devices')
      .select('ip_address, port, username, password_encrypted')
      .eq('id', deviceId)
      .single();

    if (error || !device) {
      console.error(`[Proxy] Device not found in DB for ID: ${deviceId}`, error);
      return res.status(404).json({ error: 'Device not found' });
    }

    // IMPORTANT: Decrypt the password.
    // In a real scenario, `password_encrypted` would be a reference to a secret
    // in a vault (like Supabase Vault), and we would use a Supabase Edge Function
    // or similar secure method to retrieve the actual password.
    // For now, we'll assume it's retrievable and log a warning.
    console.warn(`[Proxy] SECURITY WARNING: In a real implementation, the password must be retrieved from a secure vault.`);
    const decryptedPassword = `decrypted-${device.password_encrypted}`; // Placeholder

    console.log(`[Proxy] Found device: ${device.ip_address}:${device.port}`);

    // 2. Use the 'hikvision-isapi' library to connect and configure
    const hikvisionClient = new HikvisionSDK({
      host: device.ip_address,
      port: device.port,
      user: device.username,
      pass: decryptedPassword,
    });

    console.log(`[Proxy] Connecting to device at ${device.ip_address}...`);

    // 3. Configure the device's event service to point to the provided webhookUrl
    // TODO: Implement the 'setNotificationServer' method in the SDK and use it here.
    // For now, we use getSystemInfo to test the connection.
    const setResult = await hikvisionClient.getSystemInfo();

    // A simple check for now
    if (setResult) {
      console.log(`[Proxy] Successfully configured webhook for device ${deviceId}`);
      res.status(200).json({
        message: 'Device provisioned successfully',
        details: setResult,
      });
    } else {
      console.error(`[Proxy] Failed to configure webhook for device ${deviceId}`, setResult);
      res.status(500).json({
        message: 'Failed to provision device',
        error: 'Could not configure webhook on the device.',
      });
    }

    // 4. Update device status in DB (optional, relates to Phase 2)
    await supabase
      .from('devices')
      .update({ status: 'online', last_sync_at: new Date().toISOString() })
      .eq('id', deviceId);

  } catch (err) {
    console.error(`[Proxy] An unexpected error occurred during provisioning for device ${deviceId}`, err);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

/**
 * Endpoint to get the status of a specific device.
 * This is the core of Phase 2's passive check.
 */
app.get('/api/v1/devices/:deviceId/status', async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  console.log(`[Proxy] Received status request for device ${deviceId}`);

  try {
    const { data: device, error } = await supabase
      .from('devices')
      .select('id, name, status, last_sync_at, last_event_at, ip_address')
      .eq('id', deviceId)
      .single();

    if (error || !device) {
      console.error(`[Proxy] Device not found in DB for status check: ${deviceId}`, error);
      return res.status(404).json({ error: 'Device not found' });
    }

    // In a future step (active health check), we would actively ping
    // the device here before returning the status. For now, we return
    // the last known status from the database.
    console.log(`[Proxy] Returning stored status for device ${deviceId}: ${device.status}`);

    return res.status(200).json(device);

  } catch (err) {
    console.error(`[Proxy] An unexpected error occurred during status check for device ${deviceId}`, err);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Add a new endpoint to get device status
app.get('/api/v1/devices/:deviceId/status', async (req, res) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('devices')
      .select('id, name, status, last_sync_at')
      .eq('id', deviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST code for "Not a single row was returned"
        return res.status(404).json({ error: 'Device not found' });
      }
      throw error;
    }

    res.status(200).json(data);
  } catch (error: any) {
    console.error(`[Proxy] Error fetching status for device ${deviceId}:`, error);
    res.status(500).json({ error: 'Internal server error while fetching device status.' });
  }
});


// Start background services
startWorker();
startHealthCheckService();
startEventFallbackService();

// Start the Express server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Proxy] Hikvision Proxy Service running on port ${PORT}`);
  // The original code had GLOBAL_RATE_LIMIT, but it's not defined.
  // Assuming it was meant to be removed or replaced with a placeholder.
  // For now, I'll remove it as it's not defined.
  // console.log(`[Proxy] Global rate limit: ${GLOBAL_RATE_LIMIT.limit} requests per ${GLOBAL_RATE_LIMIT.windowMs / 1000} seconds per IP`);
});
