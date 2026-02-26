/**
 * ZKTeco Push SDK: GET /iclock/getrequest (heartbeat)
 * Device pings this endpoint; we update device health and respond OK.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../../lib/supabase/server';
import { logger } from '../../../../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  const { company_id, SN } = req.query;

  if (!company_id || typeof company_id !== 'string') {
    logger.warn('[ZKTECO GETREQUEST] Missing company_id', { query: req.query });
    return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
  }

  const supabase = createAdminClient();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, is_active')
    .eq('id', company_id)
    .single();

  if (companyError || !company || !company.is_active) {
    logger.warn('[ZKTECO GETREQUEST] Invalid or inactive company', {
      company_id,
      error: companyError?.message,
    });
    return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
  }

  const serialNumber = typeof SN === 'string' ? SN.trim() : null;
  if (serialNumber) {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('id, name')
      .eq('company_id', company_id)
      .eq('serial_number', serialNumber);

    if (!error && devices && devices.length > 0) {
      for (const device of devices) {
        await supabase
          .from('devices')
          .update({
            last_seen_at: new Date().toISOString(),
            status: 'online',
            webhook_configured: true,
          })
          .eq('id', device.id);
      }
      logger.debug('[ZKTECO GETREQUEST] Device health updated', {
        company_id,
        SN: serialNumber,
        deviceCount: devices.length,
      });
    }
  }

  return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
}
