import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { createAdminClient } from '../../../lib/supabase/server';
import { logError, logger } from '../../../lib/logger';
import { getTodayInHonduras, nowInHonduras, toHN, convertToHondurasTime, HONDURAS_TIMEZONE } from '../../../lib/timezone';
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
 * - Multipart/form-data con parte JSON sin nombre (Content-Type: application/json)
 * - JSON contiene EventNotificationAlert con:
 *   * eventType: "heartBeat" (conectividad) o eventos de acceso
 *   * Para eventos de acceso: AccessControllerEvent/AcsEvent con cardNo/employeeNoString
 * 
 * ARQUITECTURA:
 * - Responde 200 OK inmediatamente después de parsear el JSON
 * - Procesamiento asíncrono para no bloquear al dispositivo
 * - Heartbeats actualizan device health (NO generan asistencia)
 * - Access events generan attendance_records con event_uid para idempotencia
 */

/**
 * Normaliza identificador de empleado (DNI)
 * Política: remover caracteres no numéricos, mantener tal cual
 */
function normalizeIdentifier(raw: string | number | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, '');
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
    // Convertir a hora local de Honduras
    const hondurasDate = convertToHondurasTime(parsedDate);
    
    logger.debug('[PARSE DATE] Device dateTime has timezone, converted to Honduras', {
      original: dateTimeStr,
      parsedUTC: parsedDate.toISOString(),
      hondurasLocal: hondurasDate.toISOString(),
    });
    
    return hondurasDate;
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
 * Procesa evento de acceso: crea registro de asistencia
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
  
  // Identificador del empleado (prioridad según manual)
  const rawId = 
    acs?.employeeNoString ?? 
    acs?.employeeNo ?? 
    acs?.cardNo ??
    root?.employeeNoString ??  // También puede estar en root
    root?.employeeNo ??
    root?.cardNo ??
    null;

  // Campos adicionales del Access Control Event (según manual)
  const doorNo = acs?.doorNo ?? root?.doorNo ?? null;
  const readerNo = acs?.readerNo ?? root?.readerNo ?? null;
  const verifyMode = acs?.currentVerifyMode ?? root?.currentVerifyMode ?? root?.verifyMode ?? null;
  const cardNo = acs?.cardNo ?? root?.cardNo ?? null;
  const employeeNoString = acs?.employeeNoString ?? root?.employeeNoString ?? null;

  // Log campos extraídos para debugging
  logger.debug('[ACCESS EVENT] Extracted Access Control fields', {
    companyId,
    doorNo,
    readerNo,
    verifyMode,
    cardNo,
    employeeNoString,
    hasAcs: !!acs,
    acsKeys: acs ? Object.keys(acs) : [],
    rootKeys: Object.keys(root),
  });

  const normalizedId = normalizeIdentifier(rawId);

  if (!normalizedId) {
    logger.warn('[ACCESS EVENT] No employee identifier found', {
      companyId,
      acsKeys: Object.keys(acs),
      rootKeys: Object.keys(root),
    });
    return;
  }

  // Generar event_uid para idempotencia
  const eventUid = generateEventUid(root, acs, normalizedId);

  // Verificar si ya existe (idempotencia)
  const { data: existingRecord } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('event_uid', eventUid)
    .single();

  if (existingRecord) {
    logger.info('[ACCESS EVENT] Duplicate event ignored (idempotency)', {
      companyId,
      eventUid,
      normalizedId,
      existingRecordId: existingRecord.id,
    });
    return;
  }

  // Buscar empleado con work_schedule_id
  let { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id, work_schedule_id, dni')
    .eq('company_id', companyId)
    .eq('dni', normalizedId)
    .eq('status', 'active')
    .single();

  // Si no hay match exacto, intentar búsqueda flexible
  if (employeeError || !employee) {
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, company_id, work_schedule_id, dni')
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (allEmployees) {
      employee = allEmployees.find(emp => {
        const empNormalized = normalizeIdentifier(emp.dni);
        return empNormalized === normalizedId;
      }) || null;
    }
  }

  if (!employee) {
    logger.warn('[ACCESS EVENT] Employee not found', {
      companyId,
      normalizedId,
      originalId: rawId,
      eventUid,
    });
    return;
  }

  // Extraer timestamp del evento usando función que garantiza hora de Honduras
  let eventTimestamp: Date;
  const dateTimeStr = root.dateTime ?? acs?.dateTime ?? null;
  
  eventTimestamp = parseDeviceDateTime(dateTimeStr);
  
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

  // Calcular fecha del registro usando hora local de Honduras
  // eventTimestamp ya está normalizado (UTC interno que representa hora de Honduras)
  const eventDate = hondurasTime.date; // Fecha en formato YYYY-MM-DD en hora de Honduras
  const todayDate = getTodayInHonduras();
  
  // Comparar fechas (no timestamps) para decidir si usar fecha del evento o hoy
  // Si el evento es de hace más de 24 horas, usar su fecha; si no, usar hoy
  const hoursDiff = (nowInHonduras().getTime() - eventTimestamp.getTime()) / (1000 * 60 * 60);
  const recordDate = hoursDiff > 24 ? eventDate : todayDate;
  
  // check_in se guarda como ISO string (UTC), pero representa la hora real del evento
  const checkInTimestamp = eventTimestamp.toISOString();
  
  logger.debug('[ACCESS EVENT] Date calculation', {
    companyId,
    eventDateHonduras: eventDate,
    todayDateHonduras: todayDate,
    hoursDiff,
    recordDate,
    checkInTimestamp,
  });

  // Calcular late_minutes y expected_check_in si el empleado tiene horario
  let lateMinutes: number | null = null;
  let expectedCheckIn: string | null = null;

  if (employee.work_schedule_id) {
    try {
      // Obtener horario del empleado
      const { data: schedule, error: scheduleError } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', employee.work_schedule_id)
        .single();

      if (!scheduleError && schedule) {
        // Obtener día de la semana usando hora local de Honduras
        // eventTimestamp ya está normalizado, usar toHN para obtener día correcto
        const hondurasTime = toHN(eventTimestamp);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[hondurasTime.dow];

        // Obtener horario esperado para ese día
        expectedCheckIn = (schedule as Record<string, any>)?.[`${dayName}_start`] 
          || (schedule as Record<string, any>)?.monday_start 
          || '08:00';

        // Calcular late_minutes: diferencia entre check_in y expected_check_in
        if (expectedCheckIn) {
          // Convertir eventTimestamp a hora local de Honduras
          const checkInTime = toHN(eventTimestamp);

          const [expectedHour, expectedMin] = expectedCheckIn.split(':').map(Number);
          const [checkInHour, checkInMin] = checkInTime.time.split(':').map(Number);

          const expectedMinutes = expectedHour * 60 + expectedMin;
          const checkInMinutes = checkInHour * 60 + checkInMin;
          
          // late_minutes puede ser negativo (temprano) o positivo (tarde)
          lateMinutes = checkInMinutes - expectedMinutes;

          logger.debug('[ACCESS EVENT] Calculated late_minutes', {
            companyId,
            employeeId: employee.id,
            expectedCheckIn,
            checkInTime: checkInTime.time,
            lateMinutes,
          });
        }
      }
    } catch (scheduleError) {
      logger.warn('[ACCESS EVENT] Error calculating late_minutes', {
        companyId,
        employeeId: employee.id,
        error: scheduleError instanceof Error ? scheduleError.message : String(scheduleError),
      });
      // Continuar sin late_minutes si hay error
    }
  }

  // Insertar registro de asistencia con event_uid, late_minutes y expected_check_in
  const { data: record, error: upsertError } = await supabase
    .from('attendance_records')
    .insert({
      employee_id: employee.id,
      date: recordDate,
      check_in: checkInTimestamp,
      expected_check_in: expectedCheckIn,
      late_minutes: lateMinutes,
      event_uid: eventUid,
      tz: 'America/Tegucigalpa',
      tz_offset_minutes: -360,
      status: 'present',
    })
    .select()
    .single();

  if (upsertError) {
    // Si es error de duplicado por event_uid, ignorar (ya lo verificamos, pero por si acaso)
    if (upsertError.code === '23505') {
      logger.info('[ACCESS EVENT] Duplicate event_uid (race condition)', {
        companyId,
        eventUid,
        normalizedId,
      });
      return;
    }

    logger.error('[ACCESS EVENT] Failed to insert attendance record', upsertError, {
      companyId,
      employeeId: employee.id,
      normalizedId,
      eventUid,
      recordDate,
    });
    return;
  }

  logger.info('[ACCESS EVENT] Attendance recorded successfully', {
    companyId,
    employeeId: employee.id,
    normalizedId,
    eventUid,
    recordId: record?.id,
    recordDate,
    checkIn: checkInTimestamp,
    // Incluir campos del Access Control Event para auditoría
    doorNo,
    readerNo,
    verifyMode,
    cardNo,
    employeeNoString,
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

    // Heartbeat: actualizar device health
    if (eventType === 'heartBeat') {
      await processHeartbeat(root, companyId);
      return;
    }

    // Access event: crear registro de asistencia
    if (hasAcsEvent && acs) {
      await processAccessEvent(root, acs, companyId);
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

  let rawEvent: any = null;

  try {
    // Log incoming request metadata
    logger.info('[ATTENDANCE WEBHOOK] Request received', {
      companyId: company_id,
      method: req.method,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      contentLength: req.headers['content-length'],
    });

    // Configure formidable
    const form = formidable({
      keepExtensions: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
    });

    // Parse multipart
    let fields: any;
    let files: any;

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

    // Extraer JSON root según especificación del manual Hikvision:
    // - Multipart puede tener múltiples partes (JSON + binarios/imágenes)
    // - La parte JSON puede venir sin nombre (fieldname) y será tratada como "file"
    // - Debe iterar TODAS las partes para encontrar la JSON entre varias
    let jsonString: string | null = null;
    const tempFilesToCleanup: string[] = [];

    // Caso 1: Buscar JSON en files (partes sin nombre - formato Hikvision EventNotificationAlert)
    // Iterar TODAS las partes, no solo la primera
    if (files && Object.keys(files).length > 0) {
      for (const fileKey of Object.keys(files)) {
        const fileArray = files[fileKey];
        if (Array.isArray(fileArray)) {
          for (const file of fileArray) {
            // Buscar parte con mimetype application/json
            if (file.mimetype === 'application/json' && file.filepath) {
              try {
                const content = fs.readFileSync(file.filepath, 'utf-8');
                // Verificar que realmente es JSON
                if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                  jsonString = content;
                  tempFilesToCleanup.push(file.filepath);
                  logger.info('[ATTENDANCE WEBHOOK] Found JSON in multipart file part', {
                    companyId: company_id,
                    fileKey,
                    mimetype: file.mimetype,
                    size: file.size,
                  });
                  break; // Encontramos la parte JSON, salir
                }
              } catch (fileError) {
                logger.error('[ATTENDANCE WEBHOOK] Error reading JSON file part', fileError as Error, {
                  companyId: company_id,
                  fileKey,
                });
              }
            }
          }
          if (jsonString) break; // Ya encontramos JSON, salir del loop externo
        }
      }
    }

    // Caso 2: Buscar JSON en fields (formato curl test o named fields)
    if (!jsonString && Object.keys(fields).length > 0) {
      // Intentar extraer de cualquier campo que parezca JSON
      for (const [key, value] of Object.entries(fields)) {
        if (Array.isArray(value) && value.length > 0) {
          const fieldValue = value[0];
          if (typeof fieldValue === 'string' && (fieldValue.trim().startsWith('{') || fieldValue.trim().startsWith('['))) {
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

    // Cleanup: eliminar archivos temporales de partes JSON procesadas
    for (const filepath of tempFilesToCleanup) {
      try {
        fs.unlinkSync(filepath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Parsear JSON root
    if (jsonString) {
      try {
        rawEvent = JSON.parse(jsonString);
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
