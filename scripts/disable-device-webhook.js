#!/usr/bin/env node

/**
 * Emergency script to disable webhook on Hikvision device
 * Usage: node scripts/disable-device-webhook.js <deviceId>
 */

const https = require('https');
const http = require('http');

const deviceId = process.argv[2] || '24e66ba0-c3e5-4d76-b686-e6e9744b217c';
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net';
const secret = process.env.CRON_SECRET || process.env.EMERGENCY_WEBHOOK_SECRET;

if (!secret) {
  console.error('❌ Error: CRON_SECRET or EMERGENCY_WEBHOOK_SECRET environment variable not set');
  process.exit(1);
}

const url = new URL(`${baseUrl}/api/admin/devices/disable-webhook-emergency`);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const postData = JSON.stringify({
  deviceId,
  secret,
});

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log(`🚨 Disabling webhook on device: ${deviceId}`);
console.log(`📡 Sending request to: ${url.toString()}`);

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log('✅ Success!');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`❌ Error: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Request error:`, error.message);
  process.exit(1);
});

req.write(postData);
req.end();






