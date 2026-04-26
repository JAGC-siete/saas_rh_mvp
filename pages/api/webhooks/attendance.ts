import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { createAdminClient } from '../../../lib/supabase/server';
import { logError, logger } from '../../../lib/logger';
import { nowInHonduras, toHN } from '../../../lib/timezone';
import {
  RAW_PUNCH_EVENT_TYPE,
  generateDailyCloseReport,
} from '../../../lib/attendance/daily-close';
import { createHash } from 'crypto';
import fs from 'fs';

// Desactivamos el parser de body de Next.js para que formidable pueda procesar el stream.
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Webhook para recibir eventos desde dispositivos Hikvision DS-K1T344MBWX-QRE1
 * 
 * FORMATO ESPERADO (según manual ISAPI):
 * - Multipart/form-data con parte JSON sin nombre (parte con Content-Type: application/json), o
 * - Cuerpo único application/json (algunos firmwares / pruebas curl)
 * - JSON contiene EventNotificationAlert con:
 *   * eventType: "heartBeat" (conectividad) o eventos de acceso
 *   * Para eventos de acceso: AccessControllerEvent/AcsEvent con cardNo/employeeNoString
 * 
 * ARQUITECTURA:
 * - Responde 200 OK inmediatamente después de parsear el JSON
 * - Procesamiento asíncrono para no bloquear al dispositivo
 * - Heartbeats actualizan device health (NO generan asistencia)
 * - Access events insertan attendance_events (raw_punch); tras insert exitoso se ejecuta
 *   generateDailyCloseReport para ese local_date (borrador en vivo; registros finalizados no se pisan).
 * - La pantalla de cierre / finalizar sigue siendo la vía para bloquear y ajustes admin.
 */

/**
 * Normaliza identificador de empleado (DNI)
 * Política: remover caracteres no numéricos, mantener tal cual.
 * Si el valor es hex (0x... o contiene a-f), convertir a decimal para matching.
 */
const WEBHOOK_MAX_BODY_BYTES = 10 * 1024 * 1024;

function readRawBody(req: NextApiRequest, maxBytes = WEBHOOK_MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Request body exceeds max size'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function normalizeIdentifier(raw: string | number | undefined): string | undefined {
  if (!raw) return undefined;
  const str = String(raw).trim();
  // Si es hex explícito (0x...) o contiene letras hex (a-f), convertir a decimal
  if ((/^0[xX][0-9a-fA-F]+$/.test(str) || /[a-fA-F]/.test(str)) && /^0?[xX]?[0-9a-fA-F]+$/.test(str)) {
    const parsed = parseInt(str.replace(/^0[xX]/, ''), 16);
    if (!isNaN(parsed) && parsed > 0 && String(parsed).length >= 10) {
      return String(parsed);
    }
  }
  const digits = str.replace(/\D/g, '');
  return digits || undefined;
}

/**
 * Parsea y normaliza fecha/hora del dispositivo Hikvision a hora local de Honduras
 * 
 * El dispositivo puede enviar fecha en diferentes formatos:
 * - ISO 8601 con Z (UTC): "2024-12-02T14:30:00Z"
 * - ISO 8601 sin zona: "2024-12-02T14:30:00" (asumimos hora local de Honduras)
 * - Formato Hikvision: puede variar según firmware
 * 
 * Esta función garantiza que el timestamp resultante represente la hora REAL del evento
 * en zona horaria de Honduras (America/Tegucigalpa, UTC-6).
 */
function parseDeviceDateTime(dateTimeStr: string | undefined | null): Date {
  if (!dateTimeStr) {
    logger.warn('[PARSE DATE] No dateTime provided, using current Honduras time');
    return nowInHonduras();
  }

  let parsedDate: Date;
  
  // Intentar parsear como ISO 8601
  parsedDate = new Date(dateTimeStr);
  
  if (isNaN(parsedDate.getTime())) {
    logger.warn('[PARSE DATE] Invalid dateTime format, using current Honduras time', {
      received: dateTimeStr,
    });
    return nowInHonduras();
  }

  // Detectar si tiene indicador de zona horaria (Z, +HH:MM, -HH:MM)
  const hasTimezone = /[Zz]|[\+\-]\d{2}:?\d{2}$/.test(dateTimeStr);
  
  if (hasTimezone) {
    // Si tiene zona horaria explícita, el dispositivo envió UTC o con offset
    // ✅ CORRECCIÓN: NO convertir aquí. Guardar el timestamp UTC directamente.
    // El frontend ya hace la conversión correcta usando toLocaleTimeString() con timeZone.
    // Si convertimos aquí restando horas, guardamos un timestamp incorrecto.
    
    logger.debug('[PARSE DATE] Device dateTime has timezone, storing as UTC (frontend will convert)', {
      original: dateTimeStr,
      storedAsUTC: parsedDate.toISOString(),
      note: 'Frontend will convert to Honduras timezone for display',
    });
    
    return parsedDate; // ✅ Devolver el timestamp UTC sin modificar
  } else {
    // Si NO tiene zona horaria, asumimos que es hora LOCAL del dispositivo
    // El dispositivo está configurado en hora de Honduras, así que el string
    // representa directamente la hora local de Honduras (America/Tegucigalpa, UTC-6)
    
    // Parsear el string para extraer componentes (sin interpretar como hora local del servidor)
    // Formato esperado: "YYYY-MM-DDTHH:mm:ss" o variantes
    const dateMatch = dateTimeStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
    
    if (!dateMatch) {
      logger.warn('[PARSE DATE] Could not parse dateTime format, using current Honduras time', {
        received: dateTimeStr,
      });
      return nowInHonduras();
    }
    
    const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = dateMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dayStr, 10);
    const hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    const seconds = parseInt(secondStr, 10);
    
    // Crear fecha interpretando estos valores como hora LOCAL de Honduras
    // Para almacenar correctamente en BD, necesitamos crear un Date UTC que represente
    // esa hora. Si el dispositivo dice "14:30" en Honduras, eso es "20:30 UTC"
    // (porque Honduras está 6 horas detrás de UTC)
    const hondurasOffsetHours = 6; // UTC-6
    const utcHours = hours + hondurasOffsetHours;
    
    // Crear fecha UTC que represente la hora correcta
    const utcDate = new Date(Date.UTC(year, month, day, utcHours, minutes, seconds));
    
    logger.debug('[PARSE DATE] Device dateTime without timezone, assumed Honduras local', {
      original: dateTimeStr,
      parsedAsHonduras: `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}:${secondStr}`,
      storedAsUTC: utcDate.toISOString(),
      verification: toHN(utcDate), // Verificar que al convertir de vuelta dé la hora correcta
    });
    
    return utcDate;
  }
}

/**
 * Genera event_uid para idempotencia
 * Formato: SHA256(macAddress|channelID|activePostCount|dateTime|employeeId)
 * Prioriza MAC sobre IP (MAC es identificador estable según manual Hikvision)
 */
function generateEventUid(root: any, acs: any, normalizedId: string | undefined): string {
  // Usar MAC como identificador principal (estable), fallback a IP si no hay MAC
  const deviceId = root.macAddress ?? root.ipAddress ?? '';
  
  const uidSource = [
    deviceId,
    String(root.channelID ?? ''),
    String(root.activePostCount ?? ''),
    String(root.dateTime ?? ''),
    normalizedId ?? ''
  ].join('|');
  
  return createHash('sha256').update(uidSource).digest('hex');
}

/**
 * Procesa heartbeat: actualiza device health
 */
async function processHeartbeat(root: any, companyId: string) {
  const supabase = createAdminClient();
  
  const ipAddress = root.ipAddress;
  const macAddress = root.macAddress;
  
  if (!ipAddress && !macAddress) {
    logger.warn('[HEARTBEAT] No ipAddress or macAddress in heartbeat', {
      companyId,
      rootKeys: Object.keys(root),
    });
    return;
  }

  // Buscar dispositivo: primero por MAC (identificador estable), luego por IP (puede cambiar con DHCP)
  // Según manual Hikvision: MAC/serial es la identidad estable del dispositivo
  let deviceQuery = supabase
    .from('devices')
    .select('id, company_id, ip_address, mac_address')
    .eq('company_id', companyId);

  if (macAddress) {
    deviceQuery = deviceQuery.eq('mac_address', macAddress);
  } else if (ipAddress) {
    deviceQuery = deviceQuery.eq('ip_address', ipAddress);
  } else {
    logger.warn('[HEARTBEAT] No macAddress or ipAddress provided, cannot find device', {
      companyId,
    });
    return;
  }

  const { data: devices, error } = await deviceQuery;

  if (error) {
    logger.error('[HEARTBEAT] Error finding device', error, {
      companyId,
      ipAddress,
      macAddress,
    });
    return;
  }

  if (!devices || devices.length === 0) {
    logger.warn('[HEARTBEAT] Device not found in database', {
      companyId,
      ipAddress,
      macAddress,
      hint: 'Device may need to be registered in devices table. MAC address is the stable identifier.',
    });
    return;
  }

  // Actualizar todos los dispositivos encontrados (por si hay múltiples matches)
  for (const device of devices) {
    // Preparar update: incluir mac_address si viene en el heartbeat y no está en BD
    const updateData: any = {
      last_seen_at: new Date().toISOString(),
      status: 'online',
      webhook_configured: true,
    };

    // Si el heartbeat trae MAC y el dispositivo no lo tiene, actualizarlo
    if (macAddress && !device.mac_address) {
      updateData.mac_address = macAddress;
    }

    // Si el heartbeat trae IP y es diferente, actualizarlo (IP puede cambiar con DHCP)
    if (ipAddress && device.ip_address !== ipAddress) {
      updateData.ip_address = ipAddress;
    }

    const { error: updateError } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', device.id);

    if (updateError) {
      logger.error('[HEARTBEAT] Error updating device', updateError, {
        companyId,
        deviceId: device.id,
        ipAddress,
        macAddress,
      });
    } else {
      logger.info('[HEARTBEAT] Device health updated', {
        companyId,
        deviceId: device.id,
        ipAddress,
        macAddress,
        status: 'online',
        macAddressUpdated: macAddress && !device.mac_address,
        ipAddressUpdated: ipAddress && device.ip_address !== ipAddress,
      });
    }
  }
}

/**
 * Resuelve dispositivo Hikvision (MAC prioritaria) para FK attendance_events.device_id.
 */
async function resolveDeviceIdForAccess(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  root: any
): Promise<string | null> {
  const ipAddress = root.ipAddress;
  const macAddress = root.macAddress;
  if (!ipAddress && !macAddress) return null;

  let deviceQuery = supabase
    .from('devices')
    .select('id')
    .eq('company_id', companyId);

  if (macAddress) {
    deviceQuery = deviceQuery.eq('mac_address', macAddress);
  } else {
    deviceQuery = deviceQuery.eq('ip_address', ipAddress);
  }

  const { data: devices, error } = await deviceQuery.limit(1);
  if (error || !devices?.length) return null;
  return devices[0].id as string;
}

/**
 * Ingesta inmutable: una fila en attendance_events por marca biométrica (sin interpretación).
 * @returns true si se insertó una fila nueva (no duplicado).
 */
async function insertRawBiometricPunch(params: {
  supabase: ReturnType<typeof createAdminClient>;
  employeeId: string;
  companyId: string;
  eventTimestamp: Date;
  eventUid: string;
  localDate: string;
  deviceId: string | null;
  doorNo: any;
  readerNo: any;
  verifyMode: any;
  cardNo: any;
  employeeNoString: any;
}): Promise<boolean> {
  const {
    supabase,
    employeeId,
    eventTimestamp,
    eventUid,
    localDate,
    deviceId,
    doorNo,
    readerNo,
    verifyMode,
    cardNo,
    employeeNoString,
  } = params;

  const punchFlags: Record<string, unknown> = {};
  if (doorNo != null) punchFlags.doorNo = doorNo;
  if (readerNo != null) punchFlags.readerNo = readerNo;
  if (verifyMode != null) punchFlags.verifyMode = verifyMode;
  if (cardNo != null) punchFlags.cardNo = cardNo;
  if (employeeNoString != null) punchFlags.employeeNoString = employeeNoString;

  const { error } = await supabase.from('attendance_events').insert({
    employee_id: employeeId,
    event_type: RAW_PUNCH_EVENT_TYPE,
    ts_utc: eventTimestamp.toISOString(),
    tz: 'America/Tegucigalpa',
    tz_offset_minutes: -360,
    event_uid: eventUid,
    local_date: localDate,
    device_id: deviceId,
    source: 'hikvision_webhook',
    ref_record_id: null,
    flags: Object.keys(punchFlags).length > 0 ? punchFlags : null,
  });

  if (error) {
    if (error.code === '23505') {
      logger.info('[ACCESS EVENT] Duplicate punch ignored (event_uid)', { eventUid, employeeId });
      return false;
    }
    logger.error('[ACCESS EVENT] Failed to insert attendance_events', error, {
      employeeId,
      eventUid,
    });
    return false;
  }
  return true;
}

/**
 * Procesa evento de acceso: bitácora cruda en attendance_events
 */
async function processAccessEvent(
  root: any,
  acs: any,
  companyId: string
) {
  const supabase = createAdminClient();

  // Extraer campos del AccessControllerEvent/AcsEvent según manual Hikvision
  // Los campos pueden estar en acs o en root (según versión de firmware)
  // Campos requeridos: cardNo, employeeNoString, doorNo, readerNo, currentVerifyMode
  
  // Identificador del empleado (prioridad según manual Hikvision + variantes fingerprint)
  // Algunos dispositivos con fingerprint-only envían employeeNoHex o credentialNo en lugar de employeeNoString
  const rawId =
    acs?.employeeNoString ??
    acs?.employeeNo ??
    acs?.cardNo ??
    acs?.employeeNoHex ?? // Hexadecimal (algunos firmwares con fingerprint)
    acs?.credentialNo ?? // Alternativa en dispositivos biométricos
    acs?.personNo ??
    root?.employeeNoString ??
    root?.employeeNo ??
    root?.cardNo ??
    root?.employeeNoHex ??
    root?.credentialNo ??
    root?.personNo ??
    null;

  // Campos adicionales del Access Control Event (según manual)
  const doorNo = acs?.doorNo ?? root?.doorNo ?? null;
  const readerNo = acs?.readerNo ?? root?.readerNo ?? null;
  const verifyMode = acs?.currentVerifyMode ?? root?.currentVerifyMode ?? root?.verifyMode ?? null;
  const cardNo = acs?.cardNo ?? root?.cardNo ?? null;
  const employeeNoString = acs?.employeeNoString ?? root?.employeeNoString ?? null;

  const normalizedId = normalizeIdentifier(rawId);

  // Log 1: identifier extraction result
  logger.info('[ACCESS EVENT] Identifier extracted', {
    companyId,
    rawId,
    normalizedId,
    normalizedIdIsUndefined: normalizedId === undefined,
  });

  if (!normalizedId) {
    // Log 2: full payload dump so we can see what the non-working terminal is sending
    logger.info('[ACCESS EVENT] No employee identifier found — full payload', {
      companyId,
      fullPayload: JSON.stringify({ root, acs }),
    });
    logger.warn('[ACCESS EVENT] No employee identifier found', { companyId });
    return;
  }

  // Generar event_uid para idempotencia
  const eventUid = generateEventUid(root, acs, normalizedId);

  let { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id, work_schedule_id, dni, pay_type')
    .eq('company_id', companyId)
    .eq('dni', normalizedId)
    .eq('status', 'active')
    .single();

  // Si no hay match exacto, intentar búsqueda flexible (normalización de DNI)
  if (employeeError || !employee) {
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, company_id, work_schedule_id, dni, pay_type')
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (allEmployees) {
      employee = allEmployees.find(emp => {
        const empNormalized = normalizeIdentifier(emp.dni);
        return empNormalized === normalizedId;
      }) || null;
    }
  }

  // Log 3: employee search result
  logger.info('[ACCESS EVENT] Employee search result', {
    companyId,
    normalizedId,
    found: !!employee,
    employeeDni: employee?.dni ?? null,
  });

  if (!employee) {
    logger.warn('[ACCESS EVENT] Employee not found', {
      companyId,
      normalizedId,
      originalId: rawId,
      eventUid,
      searchAttempted: true,
    });
    return;
  }

  logger.info('[ACCESS EVENT] Employee found successfully', {
    companyId,
    employeeId: employee.id,
    dni: employee.dni,
    normalizedId,
    payType: (employee as any).pay_type,
    workScheduleId: employee.work_schedule_id,
  });

  const { data: existingPunch } = await supabase
    .from('attendance_events')
    .select('id')
    .eq('event_uid', eventUid)
    .maybeSingle();

  if (existingPunch) {
    logger.info('[ACCESS EVENT] Duplicate punch ignored (attendance_events.event_uid)', {
      companyId,
      eventUid,
      employeeId: employee.id,
    });
    return;
  }

  // Extraer timestamp del evento usando función que garantiza hora de Honduras
  let eventTimestamp: Date;
  const dateTimeStr = root.dateTime ?? acs?.dateTime ?? null;
  
  // 🔍 PASO 2: Instrumentar el webhook - Log del campo crudo del dispositivo
  logger.info('[ACCESS EVENT] RAW event payload time fields', {
    companyId,
    rawTimestampField: dateTimeStr,
    rootDateTime: root.dateTime,
    acsDateTime: acs?.dateTime,
    hasTimezone: dateTimeStr ? /[Zz]|[\+\-]\d{2}:?\d{2}$/.test(dateTimeStr) : null,
  });
  
  eventTimestamp = parseDeviceDateTime(dateTimeStr);
  
  // 🔍 PASO 2: Log del timestamp parseado ANTES de guardar
  logger.info('[ACCESS EVENT] Parsed eventTimestamp BEFORE saving', {
    companyId,
    asString: eventTimestamp.toString(),
    asISOString: eventTimestamp.toISOString(),
    rawInput: dateTimeStr,
  });
  
  // Convertir a hora local de Honduras para cálculos y logging
  const hondurasTime = toHN(eventTimestamp);
  
  logger.debug('[ACCESS EVENT] Parsed device timestamp', {
    companyId,
    deviceDateTime: dateTimeStr,
    parsedTimestamp: eventTimestamp.toISOString(),
    hondurasDate: hondurasTime.date,
    hondurasTime: hondurasTime.time,
    dayOfWeek: hondurasTime.dow,
  });

  // Fecha calendario local (Honduras) del instante de la marca — bitácora inmutable
  const eventDate = hondurasTime.date;

  logger.debug('[ACCESS EVENT] local_date for punch', {
    companyId,
    eventDateHonduras: eventDate,
    eventTimestamp: eventTimestamp.toISOString(),
  });

  const deviceId = await resolveDeviceIdForAccess(supabase, companyId, root);

  const inserted = await insertRawBiometricPunch({
    supabase,
    employeeId: employee.id,
    companyId,
    eventTimestamp,
    eventUid,
    localDate: eventDate,
    deviceId,
    doorNo,
    readerNo,
    verifyMode,
    cardNo,
    employeeNoString,
  });

  if (inserted) {
    try {
      await generateDailyCloseReport({
        companyId,
        localDate: eventDate,
        supabase,
      });
    } catch (closeErr) {
      logger.error(
        '[ACCESS EVENT] generateDailyCloseReport after raw_punch failed',
        closeErr instanceof Error ? closeErr : new Error(String(closeErr)),
        { companyId, localDate: eventDate, employeeId: employee.id }
      );
    }
  }

  logger.info('[ACCESS EVENT] processAccessEvent completed (raw_punch)', {
    companyId,
    normalizedId,
    eventUid,
  });
}

/**
 * Procesa evento de forma asíncrona
 */
async function processEvent(rawEvent: any, companyId: string) {
  try {
    const root = rawEvent;

    // Extraer eventType y eventState
    const eventType = root.eventType;
    const eventState = root.eventState;

    // Detectar si hay bloque de Access Control
    const hasAcsEvent =
      !!root.AccessControllerEvent ||
      !!root.EventNotificationAlert?.AccessControllerEvent ||
      !!root.AcsEvent ||
      !!root.EventNotificationAlert?.AcsEvent;

    const acs =
      root.AccessControllerEvent ??
      root.EventNotificationAlert?.AccessControllerEvent ??
      root.AcsEvent ??
      root.EventNotificationAlert?.AcsEvent ??
      null;

    logger.info('[WEBHOOK] Event classification', {
      companyId,
      eventType,
      eventState,
      hasAcsEvent,
      hasAcs: !!acs,
      rootKeys: Object.keys(root),
      acsKeys: acs ? Object.keys(acs) : [],
    });

    // Access event: prioridad sobre heartbeat (algunos dispositivos envían eventType: heartBeat con AccessControllerEvent)
    if (hasAcsEvent && acs) {
      logger.info('[WEBHOOK] Processing as access event', { companyId });
      await processAccessEvent(root, acs, companyId);
      return;
    }

    // Heartbeat: actualizar device health (solo si no es evento de acceso)
    if (eventType === 'heartBeat') {
      logger.info('[WEBHOOK] Processing as heartbeat', { companyId });
      await processHeartbeat(root, companyId);
      return;
    }

    // Evento desconocido
    logger.info('[WEBHOOK] Unknown event type received', {
      companyId,
      eventType,
      eventState,
      hasAcsEvent,
      rootKeys: Object.keys(root),
    });

  } catch (error) {
    logError(error as Error, {
      additionalData: {
        company_id: companyId,
        rawEvent,
      },
      endpoint: '/api/webhooks/attendance',
    });
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { company_id } = req.query;

  if (!company_id || typeof company_id !== 'string') {
    logger.warn('[ATTENDANCE WEBHOOK] Missing company_id', { query: req.query });
    // Responder 200 incluso si falta company_id (no bloquear dispositivo)
    return res.status(200).json({ success: false, message: 'company_id is required' });
  }

  // VALIDATE: Verify that company_id exists and is active
  const supabase = createAdminClient();
  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, is_active, name')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      logger.warn('[ATTENDANCE WEBHOOK] Invalid company_id provided', {
        company_id,
        error: companyError?.message
      });
      // Still respond 200 to not block device, but log the issue
      return res.status(200).json({
        success: false,
        message: 'Invalid company_id',
        warning: 'Company not found or inactive'
      });
    }

    if (!company.is_active) {
      logger.warn('[ATTENDANCE WEBHOOK] Company not active', {
        company_id,
        company_name: company.name,
        is_active: company.is_active
      });
      // Still respond 200 to not block device
      return res.status(200).json({
        success: false,
        message: 'Company not active',
        warning: 'Company account is not active'
      });
    }

    logger.debug('[ATTENDANCE WEBHOOK] Valid company_id confirmed', {
      company_id,
      company_name: company.name
    });

  } catch (validationError) {
    logger.error('[ATTENDANCE WEBHOOK] Error validating company_id', validationError);
    // Continue processing even if validation fails (fail-open for device compatibility)
  }

  let rawEvent: any = null;

  try {
    const contentTypeHeader = String(req.headers['content-type'] || '').toLowerCase();
    const isRawJsonBody =
      contentTypeHeader.includes('application/json') || contentTypeHeader.includes('text/json');

    let jsonString: string | null = null;
    let fields: Record<string, unknown> = {};
    let files: Record<string, unknown> = {};

    if (isRawJsonBody) {
      try {
        const body = await readRawBody(req);
        const trimmed = body.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          jsonString = body;
          logger.info('[ATTENDANCE WEBHOOK] Using raw JSON body (not multipart)', {
            companyId: company_id,
            contentType: req.headers['content-type'],
            byteLength: Buffer.byteLength(body, 'utf8'),
          });
        } else if (trimmed.length > 0) {
          logger.warn('[ATTENDANCE WEBHOOK] Raw JSON Content-Type but body does not look like JSON', {
            companyId: company_id,
            preview: trimmed.slice(0, 200),
          });
        }
      } catch (rawErr) {
        logger.error('[ATTENDANCE WEBHOOK] Raw body read error', rawErr as Error, {
          companyId: company_id,
          contentType: req.headers['content-type'],
        });
        return res.status(200).json({ success: false, message: 'Failed to read request body' });
      }
    } else {
      const form = formidable({
        keepExtensions: false,
        maxFileSize: WEBHOOK_MAX_BODY_BYTES,
        multiples: false,
      });

      try {
        [fields, files] = await form.parse(req);
      } catch (parseError) {
        logger.error('[ATTENDANCE WEBHOOK] Formidable parse error', parseError as Error, {
          companyId: company_id,
        contentType: req.headers['content-type'],
      });
      // Responder 200 incluso si hay error de parsing (no bloquear dispositivo)
      return res.status(200).json({ success: false, message: 'Failed to parse form data' });
    }

      const tempFilesToCleanup: string[] = [];

      // Extraer JSON root según especificación del manual Hikvision:
      // - Multipart puede tener múltiples partes (JSON + binarios/imágenes)
      // - La parte JSON puede venir sin nombre (fieldname) y será tratada como "file"
      // - Debe iterar TODAS las partes para encontrar la JSON entre varias

      if (files && Object.keys(files).length > 0) {
        for (const fileKey of Object.keys(files)) {
          const fileArray = files[fileKey];
          if (Array.isArray(fileArray)) {
            for (const file of fileArray) {
              if (file.mimetype === 'application/json' && file.filepath) {
                try {
                  const content = fs.readFileSync(file.filepath, 'utf-8');
                  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                    jsonString = content;
                    tempFilesToCleanup.push(file.filepath);
                    logger.info('[ATTENDANCE WEBHOOK] Found JSON in multipart file part', {
                      companyId: company_id,
                      fileKey,
                      mimetype: file.mimetype,
                      size: file.size,
                    });
                    break;
                  }
                } catch (fileError) {
                  logger.error('[ATTENDANCE WEBHOOK] Error reading JSON file part', fileError as Error, {
                    companyId: company_id,
                    fileKey,
                  });
                }
              }
            }
            if (jsonString) break;
          }
        }
      }

      if (!jsonString && Object.keys(fields).length > 0) {
        for (const [key, value] of Object.entries(fields)) {
          if (Array.isArray(value) && value.length > 0) {
            const fieldValue = value[0];
            if (
              typeof fieldValue === 'string' &&
              (fieldValue.trim().startsWith('{') || fieldValue.trim().startsWith('['))
            ) {
              jsonString = fieldValue;
              logger.info('[ATTENDANCE WEBHOOK] Found JSON in multipart field', {
                companyId: company_id,
                fieldName: key,
              });
              break;
            }
          }
        }
      }

      for (const filepath of tempFilesToCleanup) {
        try {
          fs.unlinkSync(filepath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    // Parsear JSON root
    if (jsonString) {
      try {
        rawEvent = JSON.parse(jsonString);

        // [DEBUG] Log the full raw payload received from the terminal before any processing.
        // This is the single most important log for diagnosing terminals that send unexpected
        // payload structures (e.g. missing cardNo/employeeNoString fields).
        logger.info('[ATTENDANCE WEBHOOK] Full raw payload received from terminal', {
          companyId: company_id,
          deviceIp: req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown',
          contentType: req.headers['content-type'],
          rawJsonString: jsonString,
          parsedPayloadKeys: rawEvent ? Object.keys(rawEvent) : [],
          parsedPayload: rawEvent,
        });
      } catch (parseError) {
        logger.error('[ATTENDANCE WEBHOOK] JSON parse error', parseError as Error, {
        companyId: company_id,
          jsonPreview: jsonString.substring(0, 500),
        });
        // Responder 200 incluso si hay error de parsing (no bloquear dispositivo)
        return res.status(200).json({ success: false, message: 'Invalid JSON format' });
      }
    }

    // Si no se encontró JSON, responder 200 (puede ser heartbeat vacío o formato desconocido)
    if (!rawEvent) {
      logger.warn('[ATTENDANCE WEBHOOK] No JSON found in request', {
        companyId: company_id,
        fieldCount: Object.keys(fields).length,
        fileCount: files ? Object.keys(files).length : 0,
      });
      return res.status(200).json({ success: true, message: 'Empty event received' });
    }

    // **RESPONDER 200 INMEDIATAMENTE** después de parsear el JSON
    // El procesamiento se hace de forma asíncrona
    res.status(200).json({ success: true, message: 'Event received' });

    // Procesar evento de forma asíncrona (no esperar)
    processEvent(rawEvent, company_id).catch((error) => {
      logError(error as Error, {
        additionalData: {
          company_id: company_id,
          rawEvent,
        },
        endpoint: '/api/webhooks/attendance',
      });
    });

  } catch (error) {
    // Cualquier error: responder 200 para no bloquear dispositivo
    logError(error as Error, {
      additionalData: {
        company_id: company_id,
      },
      endpoint: '/api/webhooks/attendance',
    });
    
    // Si aún no se ha respondido, responder 200
    if (!res.headersSent) {
      return res.status(200).json({
      success: false,
      error: 'An internal server error occurred.',
    });
    }
  }
};

export default handler;
