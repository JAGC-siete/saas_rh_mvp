/**
 * ZKTeco Push SDK: POST /iclock/cdata (attendance logs)
 * Receives ATTLOG tab-separated format, parses, resolves employees, creates attendance_records.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../../lib/supabase/server';
import { logger } from '../../../../../lib/logger';
import { parseAttlogBody } from '../../../../../lib/attendance/parse-zkteco-attlog';
import { resolveEmployeeByPin } from '../../../../../lib/attendance/resolve-employee-by-pin';
import { parseZktecoDateTime, getTodayInHonduras, nowInHonduras, toHN } from '../../../../../lib/timezone';
import { processAttendanceMark } from '../../../attendance';
import { createHash } from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function generateEventUid(sn: string, table: string, stamp: string, pin: string, datetime: string, verifyMethod: number): string {
  const source = [sn, table, stamp, pin, datetime, String(verifyMethod)].join('|');
  return createHash('sha256').update(source).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const { company_id, SN, table, Stamp } = req.query;

  if (!company_id || typeof company_id !== 'string') {
    logger.warn('[ZKTECO CDATA] Missing company_id', { query: req.query });
    return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
  }

  const supabase = createAdminClient();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, is_active')
    .eq('id', company_id)
    .single();

  if (companyError || !company || !company.is_active) {
    logger.warn('[ZKTECO CDATA] Invalid or inactive company', {
      company_id,
      error: companyError?.message,
    });
    return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
  }

  if (table !== 'ATTLOG') {
    logger.debug('[ZKTECO CDATA] Ignoring non-ATTLOG table', { table });
    return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
  }

  let body: string;
  try {
    body = await readRawBody(req);
  } catch (err) {
    logger.error('[ZKTECO CDATA] Error reading body', err as Error, { company_id });
    return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
  }

  const records = parseAttlogBody(body);
  const sn = typeof SN === 'string' ? SN.trim() : '';
  const stamp = typeof Stamp === 'string' ? Stamp : '';

  for (const rec of records) {
    try {
      const employee = await resolveEmployeeByPin(supabase, company_id, rec.pin);
      if (!employee) {
        logger.warn('[ZKTECO CDATA] Employee not found for PIN', {
          company_id,
          pin: rec.pin,
          hint: 'Configure employee_aliases, employee_code, or dni to match device PIN',
        });
        continue;
      }

      const eventTimestamp = parseZktecoDateTime(rec.datetime);
      const hondurasTime = toHN(eventTimestamp);
      const eventDate = hondurasTime.date;
      const todayDate = getTodayInHonduras();
      const hoursDiff = (nowInHonduras().getTime() - eventTimestamp.getTime()) / (1000 * 60 * 60);
      const recordDate = hoursDiff > 24 ? eventDate : todayDate;

      const eventUid = generateEventUid(sn, table || '', stamp, rec.pin, rec.datetime, rec.verifyMethod);

      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('event_uid', eventUid)
        .single();

      if (existing) {
        logger.debug('[ZKTECO CDATA] Duplicate event ignored', { eventUid, pin: rec.pin });
        continue;
      }

      await processAttendanceMark({
        employee,
        eventTimestamp,
        recordDate,
        eventUid,
        companyId: company_id,
        identifier: rec.pin,
      });

      logger.info('[ZKTECO CDATA] Attendance recorded', {
        company_id,
        employeeId: employee.id,
        pin: rec.pin,
        recordDate,
        eventUid,
      });
    } catch (err) {
      logger.error('[ZKTECO CDATA] Error processing record', err as Error, {
        company_id,
        pin: rec.pin,
        raw: rec.raw,
      });
    }
  }

  if (sn && records.length > 0) {
    await supabase
      .from('devices')
      .update({
        last_event_at: new Date().toISOString(),
        status: 'online',
      })
      .eq('company_id', company_id)
      .eq('serial_number', sn);
  }

  return res.status(200).setHeader('Content-Type', 'text/plain').send('OK');
}
