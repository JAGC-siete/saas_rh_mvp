import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { createAdminClient } from '../../../lib/supabase/server';
import { logError, logger } from '../../../lib/logger';
import { getTodayInHonduras, nowInHonduras } from '../../../lib/timezone';
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

  // Buscar empleado
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

  // Extraer timestamp del evento
  let eventTimestamp: Date;
  if (root.dateTime) {
    eventTimestamp = new Date(root.dateTime);
  } else if (acs.dateTime) {
    eventTimestamp = new Date(acs.dateTime);
  } else {
    eventTimestamp = nowInHonduras();
  }

  if (isNaN(eventTimestamp.getTime())) {
    eventTimestamp = nowInHonduras();
  }

  // Calcular fecha del registro
  const eventDate = eventTimestamp.toISOString().split('T')[0];
  const todayDate = getTodayInHonduras();
  const hoursDiff = (nowInHonduras().getTime() - eventTimestamp.getTime()) / (1000 * 60 * 60);
  const recordDate = hoursDiff > 24 ? eventDate : todayDate;
  const checkInTimestamp = eventTimestamp.toISOString();

  // Insertar registro de asistencia con event_uid
  const { data: record, error: upsertError } = await supabase
    .from('attendance_records')
    .insert({
      employee_id: employee.id,
      date: recordDate,
      check_in: checkInTimestamp,
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
