"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabaseClient_1 = require("./supabaseClient");
// Mock/placeholder for the actual library
// import { HikvisionISAPI } from 'hikvision-isapi';
// Load environment variables from .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const PORT = process.env.PORT || 3001;
/**
 * Health check endpoint to verify the service is running.
 */
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
/**
 * Endpoint to provision a Hikvision device.
 * This is the core of Phase 1.
 */
app.post('/api/v1/hik/provision', async (req, res) => {
    const { deviceId, webhookUrl } = req.body;
    if (!deviceId || !webhookUrl) {
        return res.status(400).json({ error: 'deviceId and webhookUrl are required' });
    }
    console.log(`[Proxy] Received provisioning request for device ${deviceId}`);
    try {
        // 1. Fetch device credentials from the database
        const { data: device, error } = await supabaseClient_1.supabase
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
        // const hikvisionClient = new HikvisionISAPI({
        //   host: device.ip_address,
        //   port: device.port,
        //   user: device.username,
        //   pass: decryptedPassword,
        // });
        console.log(`[Proxy] Simulating connection to device at ${device.ip_address}...`);
        // 3. Configure the device's event service to point to the provided webhookUrl
        // This is a placeholder for the actual library call.
        // const setResult = await hikvisionClient.Event.setNotificationServer({
        //   addressingFormatType: 'ipaddress',
        //   ipAddress: new URL(webhookUrl).hostname,
        //   portNo: new URL(webhookUrl).port || 443,
        //   url: new URL(webhookUrl).pathname + new URL(webhookUrl).search,
        //   protocol: 'HTTP', // or HTTPS
        // });
        // Simulate a successful configuration
        const setResult = { success: true, message: 'Simulated configuration successful.' };
        if (!setResult.success) {
            console.error(`[Proxy] Failed to configure device ${deviceId}.`, setResult.message);
            return res.status(500).json({ error: 'Failed to configure device webhook' });
        }
        console.log(`[Proxy] Successfully configured webhook for device ${deviceId} to ${webhookUrl}`);
        // 4. Update device status in DB (optional, relates to Phase 2)
        await supabaseClient_1.supabase
            .from('devices')
            .update({ status: 'online', last_sync_at: new Date().toISOString() })
            .eq('id', deviceId);
        res.status(200).json({
            message: 'Device provisioned successfully.',
            deviceId,
        });
    }
    catch (err) {
        console.error(`[Proxy] An unexpected error occurred during provisioning for device ${deviceId}`, err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
app.listen(PORT, () => {
    console.log(`Hikvision Proxy Service listening on port ${PORT}`);
});
