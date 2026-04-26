import { NextApiRequest, NextApiResponse } from 'next';
import { HikvisionSDK } from '../../../lib/hikvision/sdk';
import { requireAdminWithTenant } from '../../../lib/auth/api-guards';
import { createSuccessResponse, createErrorResponse, createNotFoundErrorResponse } from '../../../lib/security/api-responses';
import { logger } from '../../../lib/logger';

/**
 * Provision a Hikvision device by configuring its webhook URL.
 * This endpoint requires admin authentication and tenant scoping.
 * 
 * Based on Hikvision ISAPI manual:
 * - Client software/system must handle Digest Authentication
 * - Must configure httpHosts for event notifications
 * - Must expose stable HTTP server for webhooks
 * 
 * Security:
 * - Requires authentication (company_admin, hr_manager, or super_admin)
 * - Validates tenant scope (device must belong to user's company)
 * - Validates webhook URL domain
 * - Logs all provisioning actions for audit
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    // Auth + Tenant Scope - CRITICAL: Require admin role
    const { adminClient, user, companyId, auditLog } = await requireAdminWithTenant(req, res, {
      allowedRoles: ['company_admin', 'hr_manager', 'super_admin']
    });

    const { deviceId, webhookUrl } = req.body;

    if (!deviceId) {
      return res.status(400).json(createErrorResponse('deviceId is required', 'VALIDATION_ERROR'));
    }

    // 1. Fetch device and validate tenant scope
    const { data: device, error: deviceError } = await adminClient
      .from('devices')
      .select('id, company_id, ip_address, port, username, password_encrypted')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      logger.warn('Device not found for provisioning', {
        userId: user.id,
        deviceId,
        error: deviceError?.message
      });
      return res.status(404).json(createNotFoundErrorResponse('Device'));
    }

    // CRITICAL: Validate tenant scope - prevent cross-company device provisioning
    if (companyId && device.company_id !== companyId) {
      logger.warn('Tenant scope violation: attempt to provision device from another company', {
        userId: user.id,
        userCompanyId: companyId,
        deviceCompanyId: device.company_id,
        deviceId
      });
      return res.status(403).json(createErrorResponse(
        'Access denied: Device belongs to a different company',
        'TENANT_SCOPE_VIOLATION'
      ));
    }

    // If webhookUrl is not provided, construct it from environment variables
    let finalWebhookUrl = webhookUrl;
    if (!finalWebhookUrl) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                      process.env.RAILWAY_PUBLIC_DOMAIN || 
                      'https://humanosisu.net';
      
      // Validate that baseUrl is a proper URL (not localhost in production)
      if (baseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
        logger.error('CRITICAL: NEXT_PUBLIC_SITE_URL is localhost in production', {
          userId: user.id,
          deviceId
        });
        return res.status(500).json(createErrorResponse(
          'Configuration error: NEXT_PUBLIC_SITE_URL must be set to a public domain in production',
          'CONFIG_ERROR'
        ));
      }
      
      finalWebhookUrl = `${baseUrl}/api/webhooks/attendance?company_id=${device.company_id}`;
    } else {
      // Validate webhook URL domain if provided
      const allowedDomain = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net';
      try {
        const webhookUrlObj = new URL(finalWebhookUrl);
        const allowedUrlObj = new URL(allowedDomain);
        
        if (webhookUrlObj.hostname !== allowedUrlObj.hostname) {
          logger.warn('Invalid webhook URL domain', {
            userId: user.id,
            deviceId,
            providedDomain: webhookUrlObj.hostname,
            allowedDomain: allowedUrlObj.hostname
          });
          return res.status(400).json(createErrorResponse(
            'Invalid webhook URL domain',
            'INVALID_WEBHOOK_DOMAIN'
          ));
        }
      } catch (urlError) {
        return res.status(400).json(createErrorResponse(
          'Invalid webhook URL format',
          'INVALID_WEBHOOK_URL'
        ));
      }
    }

    logger.info('Hikvision device provisioning request', {
      userId: user.id,
      companyId: device.company_id,
      deviceId,
      webhookUrl: finalWebhookUrl
    });

    // IMPORTANT: The password is currently stored in plain text in the database.
    // In a real scenario, password_encrypted would be a reference to a secret
    // in a vault (like Supabase Vault), and we would use a Supabase Edge Function
    // or similar secure method to retrieve the actual password.
    logger.warn('SECURITY WARNING: Password stored in plain text. Should use secure vault in production.', {
      userId: user.id,
      deviceId
    });
    const password = device.password_encrypted;

    logger.info('Connecting to Hikvision device', {
      userId: user.id,
      deviceId,
      ipAddress: device.ip_address,
      port: device.port
    });

    // 2. Use the Hikvision SDK to connect and configure
    const hikvisionClient = new HikvisionSDK({
      host: device.ip_address,
      port: device.port,
      user: device.username,
      pass: password,
    });

    // 3. Test connection and get system info
    const systemInfo = await hikvisionClient.getSystemInfo();

    if (!systemInfo) {
      logger.error('Failed to connect to Hikvision device', {
        userId: user.id,
        deviceId,
        ipAddress: device.ip_address
      });
      return res.status(500).json(createErrorResponse(
        'Could not establish connection with the device',
        'DEVICE_CONNECTION_FAILED'
      ));
    }

    logger.info('Successfully connected to Hikvision device', {
      userId: user.id,
      deviceId,
      deviceName: systemInfo.deviceName,
      model: systemInfo.model
    });

    // 4. Configure HTTP notification server (httpHosts) on the device
    logger.info('Configuring webhook URL on device', {
      userId: user.id,
      deviceId,
      webhookUrl: finalWebhookUrl
    });

    const notificationResult = await hikvisionClient.setNotificationServer({
      webhookUrl: finalWebhookUrl,
      hostId: '1',
    });

    if (!notificationResult.success) {
      logger.error('Failed to configure notification server on device', {
        userId: user.id,
        deviceId,
        error: notificationResult.error
      });
      
      // Update device status with error
      await adminClient
        .from('devices')
        .update({ 
          status: 'error', 
          last_sync_at: new Date().toISOString(),
          webhook_url: finalWebhookUrl,
          webhook_configured: false,
          last_webhook_test_at: new Date().toISOString(),
          webhook_test_result: { error: notificationResult.error },
        })
        .eq('id', deviceId);

      return res.status(500).json(createErrorResponse(
        notificationResult.error || 'Unknown error configuring webhook',
        'WEBHOOK_CONFIG_FAILED',
        { deviceId }
      ));
    }

    logger.info('Successfully configured notification server', {
      userId: user.id,
      deviceId,
      testResult: notificationResult.testResult
    });

    // 5. Update device status in DB with webhook configuration details
    await adminClient
      .from('devices')
      .update({ 
        status: 'online', 
        last_sync_at: new Date().toISOString(),
        webhook_url: finalWebhookUrl,
        http_host_id: '1',
        webhook_configured: true,
        last_webhook_test_at: new Date().toISOString(),
        webhook_test_result: notificationResult.testResult ? { result: notificationResult.testResult } : null,
      })
      .eq('id', deviceId);
    
    // Audit log the successful provisioning
    await auditLog('device_provisioned', {
      deviceId,
      companyId: device.company_id,
      webhookUrl: finalWebhookUrl,
      deviceName: systemInfo.deviceName,
      model: systemInfo.model,
      testResult: notificationResult.testResult
    });
    
    return res.status(200).json(createSuccessResponse({
      deviceId,
      webhookUrl: finalWebhookUrl,
      systemInfo: {
        deviceName: systemInfo.deviceName,
        model: systemInfo.model,
      },
      notificationConfigured: true,
      testResult: notificationResult.testResult,
    }));

  } catch (err: any) {
    // Handle auth errors (already sent response)
    if (err.message === 'UNAUTHORIZED' || err.message === 'INSUFFICIENT_PERMISSIONS' || err.message === 'TENANT_SCOPE_VIOLATION') {
      return; // Response already sent by guard
    }

    logger.error('Unexpected error during device provisioning', {
      error: err.message,
      stack: err.stack,
      deviceId: req.body?.deviceId
    });

    return res.status(500).json(createErrorResponse(
      'An internal server error occurred',
      'INTERNAL_ERROR',
      { details: err.message }
    ));
  }
}

