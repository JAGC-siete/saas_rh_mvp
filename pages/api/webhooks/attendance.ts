import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { createAdminClient } from '../../../lib/supabase/server';
import { logError, logger } from '../../../lib/logger';
import { getTodayInHonduras, nowInHonduras, toHN, convertToHondurasTime } from '../../../lib/timezone';
import { findBestFitSchedule } from '../../../lib/attendance/best-fit-schedule';
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
 * Política: remover caracteres no numéricos, mantener tal cual.
 * Si el valor es hex (0x... o contiene a-f), convertir a decimal para matching.
 */
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
 * Maneja eventos de empleados fixed SIN horario asignado (Capa Base).
 * Primera marca = check_in, segunda marca = check_out. Sin validación de ventanas.
 * Si flags.horario_no_detectado, se emite el flag pero se procede con Capa 1.
 */
async function handleFixedEmployeeNoSchedule(
  employee: any,
  eventTimestamp: Date,
  recordDate: string,
  eventUid: string,
  companyId: string,
  doorNo: any,
  readerNo: any,
  verifyMode: any,
  cardNo: any,
  employeeNoString: any,
  flags?: { horario_no_detectado?: boolean; razon?: string; gap_minutos?: number }
) {
  const supabase = createAdminClient();

  const MAX_SHIFT_HOURS = 30;
  const MAX_SHIFT_MS = MAX_SHIFT_HOURS * 60 * 60 * 1000;

  const { data: openRecord } = await supabase
    .from('attendance_records')
    .select('id, check_in, check_out, date')
    .eq('employee_id', employee.id)
    .is('check_out', null)
    .order('check_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  const deviceMetadata: Record<string, any> = {};
  if (doorNo != null) deviceMetadata.doorNo = doorNo;
  if (readerNo != null) deviceMetadata.readerNo = readerNo;
  if (verifyMode != null) deviceMetadata.verifyMode = verifyMode;
  if (cardNo != null) deviceMetadata.cardNo = cardNo;
  if (employeeNoString != null) deviceMetadata.employeeNoString = employeeNoString;
  if (Object.keys(deviceMetadata).length > 0) deviceMetadata.source = 'hikvision_webhook';

  const insertPayload: Record<string, unknown> = {
    employee_id: employee.id,
    date: recordDate,
    check_in: eventTimestamp.toISOString(),
    event_uid: eventUid,
    tz: 'America/Tegucigalpa',
    tz_offset_minutes: -360,
    status: 'present',
    metadata: Object.keys(deviceMetadata).length > 0 ? deviceMetadata : null,
  };
  if (flags?.horario_no_detectado) {
    insertPayload.flags = {
      horario_no_detectado: true,
      razon: flags.razon || 'distancia_horario_excedida',
      gap_minutos: flags.gap_minutos,
    };
  }

  const DUPLICATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

  if (!openRecord) {
    const { data: recentCheckIn } = await supabase
      .from('attendance_records')
      .select('id, check_in')
      .eq('employee_id', employee.id)
      .eq('date', recordDate)
      .not('check_in', 'is', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCheckIn) {
      const recentTime = new Date(recentCheckIn.check_in).getTime();
      if (Math.abs(eventTimestamp.getTime() - recentTime) <= DUPLICATE_WINDOW_MS) {
        logger.info('[FIXED NO SCHEDULE] Duplicado ignorado: marca dentro de 15 min', {
          companyId,
          employeeId: employee.id,
          eventUid,
          diffMs: Math.abs(eventTimestamp.getTime() - recentTime),
        });
        return;
      }
    }
    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert(insertPayload);
    if (insertError && insertError.code !== '23505') {
      logger.error('[FIXED NO SCHEDULE] Error creating check_in', insertError, { companyId, employeeId: employee.id });
    } else {
      logger.info('[FIXED NO SCHEDULE] Check_in recorded (Capa Base)', { companyId, employeeId: employee.id, eventUid });
    }
    return;
  }

  const openCheckIn = new Date(openRecord.check_in);
  const diffMs = eventTimestamp.getTime() - openCheckIn.getTime();

  if (diffMs > 0 && diffMs <= MAX_SHIFT_MS) {
    const updatePayload: Record<string, unknown> = {
      check_out: eventTimestamp.toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (flags?.horario_no_detectado) {
      updatePayload.flags = {
        horario_no_detectado: true,
        razon: flags.razon || 'distancia_horario_excedida',
        gap_minutos: flags.gap_minutos,
      };
    }
    const { error: updateError } = await supabase
      .from('attendance_records')
      .update(updatePayload)
      .eq('id', openRecord.id);
    if (updateError) {
      logger.error('[FIXED NO SCHEDULE] Error updating check_out', updateError, { companyId, employeeId: employee.id });
    } else {
      logger.info('[FIXED NO SCHEDULE] Check_out recorded (Capa Base, cruce medianoche)', {
        companyId,
        employeeId: employee.id,
        eventUid,
        recordDate: openRecord.date,
      });
    }
    return;
  }

  if (diffMs > MAX_SHIFT_MS) {
    logger.warn('[FIXED NO SCHEDULE] Open record exceeded 30h, creating new check_in', {
      companyId,
      employeeId: employee.id,
      openRecordId: openRecord.id,
    });
    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert(insertPayload);
    if (insertError && insertError.code !== '23505') {
      logger.error('[FIXED NO SCHEDULE] Error creating check_in after orphan', insertError, {
        companyId,
        employeeId: employee.id,
      });
    }
    return;
  }

  logger.debug('[FIXED NO SCHEDULE] Event out of order, ignoring', {
    companyId,
    employeeId: employee.id,
    eventUid,
  });
}

/**
 * Maneja eventos de empleados administrativos/permanentes (pay_type = 'fixed')
 * Infiere entrada vs salida usando el horario asignado y ventanas de tiempo.
 * Si no hay horario, delega a handleFixedEmployeeNoSchedule (Capa Base).
 */
async function handleFixedEmployeeEvent(
  employee: any,
  root: any,
  acs: any,
  eventTimestamp: Date,
  recordDate: string,
  eventUid: string,
  companyId: string,
  doorNo: any,
  readerNo: any,
  verifyMode: any,
  cardNo: any,
  employeeNoString: any
) {
  const supabase = createAdminClient();

  // Capa Base: empleados sin horario — primera marca = check_in, segunda = check_out
  if (!employee.work_schedule_id) {
    await handleFixedEmployeeNoSchedule(
      employee,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
    return;
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('id', employee.work_schedule_id)
    .single();

  if (scheduleError || !schedule) {
    logger.warn('[FIXED EMPLOYEE] Error fetching schedule, fallback Capa Base', {
      companyId,
      employeeId: employee.id,
      error: scheduleError,
    });
    await handleFixedEmployeeNoSchedule(
      employee,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString,
      { horario_no_detectado: true, razon: 'error_fetch_horario' }
    );
    return;
  }

  const MAX_SHIFT_HOURS = 30;
  const MAX_SHIFT_MS = MAX_SHIFT_HOURS * 60 * 60 * 1000;

  const { data: openRecord } = await supabase
    .from('attendance_records')
    .select('id, check_in, check_out, date')
    .eq('employee_id', employee.id)
    .is('check_out', null)
    .order('check_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  const mode: 'check_in' | 'check_out' = openRecord ? 'check_out' : 'check_in';
  const bestFit = findBestFitSchedule(
    schedule as Record<string, unknown>,
    eventTimestamp,
    recordDate,
    mode
  );

  if (bestFit.horarioNoDetectado) {
    logger.info('[FIXED EMPLOYEE] Best Fit: horario_no_detectado, procediendo Capa 1', {
      companyId,
      employeeId: employee.id,
      eventUid,
      razon: bestFit.capa1Razon,
      gapMinutos: bestFit.gapMinutos,
    });
    await handleFixedEmployeeNoSchedule(
      employee,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString,
      {
        horario_no_detectado: true,
        razon: bestFit.capa1Razon || 'distancia_horario_excedida',
        gap_minutos: bestFit.gapMinutos,
      }
    );
    return;
  }

  const expectedCheckInStr = bestFit.expectedCheckIn || '08:00';
  const expectedCheckOutStr = bestFit.expectedCheckOut || '17:00';

  const [expectedInHour, expectedInMin] = expectedCheckInStr.split(':').map(Number);
  const [expectedOutHour, expectedOutMin] = expectedCheckOutStr.split(':').map(Number);
  const eventDateObj = new Date(eventTimestamp);
  const expectedCheckIn = new Date(Date.UTC(
    eventDateObj.getUTCFullYear(),
    eventDateObj.getUTCMonth(),
    eventDateObj.getUTCDate(),
    expectedInHour + 6,
    expectedInMin,
    0
  ));
  const expectedCheckOut = new Date(Date.UTC(
    eventDateObj.getUTCFullYear(),
    eventDateObj.getUTCMonth(),
    eventDateObj.getUTCDate(),
    expectedOutHour + 6,
    expectedOutMin,
    0
  ));

  const diffToInMinutes = (eventTimestamp.getTime() - expectedCheckIn.getTime()) / 60000;
  const diffToOutMinutes = (eventTimestamp.getTime() - expectedCheckOut.getTime()) / 60000;

  const WINDOW_IN_BEFORE = 60;
  const WINDOW_IN_AFTER = 60;
  const WINDOW_OUT_BEFORE = 60;
  const WINDOW_OUT_AFTER = 60;

  logger.debug('[FIXED EMPLOYEE] Event classification (Best Fit)', {
    companyId,
    employeeId: employee.id,
    recordDate,
    hasOpenRecord: !!openRecord,
    openRecordDate: openRecord?.date,
    diffToInMinutes,
    diffToOutMinutes,
    expectedCheckIn: expectedCheckInStr,
    expectedCheckOut: expectedCheckOutStr,
  });

  const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

  // REGLA 1: No hay registro abierto
  if (!openRecord) {
    const { data: recentCheckIn } = await supabase
      .from('attendance_records')
      .select('id, check_in')
      .eq('employee_id', employee.id)
      .eq('date', recordDate)
      .not('check_in', 'is', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCheckIn) {
      const recentTime = new Date(recentCheckIn.check_in).getTime();
      if (Math.abs(eventTimestamp.getTime() - recentTime) <= DUPLICATE_WINDOW_MS) {
        logger.info('[FIXED EMPLOYEE] Duplicado ignorado: check_in dentro de 15 min', {
          companyId,
          employeeId: employee.id,
          eventUid,
          diffMs: Math.abs(eventTimestamp.getTime() - recentTime),
        });
        return;
      }
    }

    // Verificar si está en ventana de entrada
    if (diffToInMinutes >= -WINDOW_IN_BEFORE && diffToInMinutes <= WINDOW_IN_AFTER) {
      // Crear registro con check_in
      const lateMinutes = Math.max(0, diffToInMinutes);
      
      // Construir metadata con información del dispositivo Hikvision
      const deviceMetadata: Record<string, any> = {};
      if (doorNo !== null && doorNo !== undefined) deviceMetadata.doorNo = doorNo;
      if (readerNo !== null && readerNo !== undefined) deviceMetadata.readerNo = readerNo;
      if (verifyMode !== null && verifyMode !== undefined) deviceMetadata.verifyMode = verifyMode;
      if (cardNo !== null && cardNo !== undefined) deviceMetadata.cardNo = cardNo;
      if (employeeNoString !== null && employeeNoString !== undefined) deviceMetadata.employeeNoString = employeeNoString;
      if (Object.keys(deviceMetadata).length > 0) {
        deviceMetadata.source = 'hikvision_webhook';
      }

      // 🔍 PASO 2: Log justo ANTES de guardar en BD
      logger.info('[ACCESS EVENT] About to save check_in to DB', {
        companyId,
        employeeId: employee.id,
        check_in_value: eventTimestamp.toISOString(),
        check_in_type: typeof eventTimestamp.toISOString(),
      });

      const { data: record, error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: recordDate,
          check_in: eventTimestamp.toISOString(),
          expected_check_in: expectedCheckInStr,
          late_minutes: Math.round(lateMinutes),
          event_uid: eventUid,
          tz: 'America/Tegucigalpa',
          tz_offset_minutes: -360,
          status: 'present',
          metadata: Object.keys(deviceMetadata).length > 0 ? deviceMetadata : null,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          logger.info('[FIXED EMPLOYEE] Duplicate check_in record (idempotency)', {
            companyId,
            employeeId: employee.id,
            eventUid,
            errorCode: insertError.code,
          });
        } else {
          logger.error('[FIXED EMPLOYEE] Error creating check_in record', insertError, {
            companyId,
            employeeId: employee.id,
            eventUid,
            recordDate,
            checkIn: eventTimestamp.toISOString(),
            errorCode: insertError.code,
            errorMessage: insertError.message,
            errorDetails: insertError.details,
            errorHint: insertError.hint,
          });
        }
      } else {
        logger.info('[FIXED EMPLOYEE] Check_in recorded', {
          companyId,
          employeeId: employee.id,
          recordId: record?.id,
          eventUid,
        });
      }
      return;
    }

    // Si está más cerca de expected_check_out que de expected_check_in
    // (llegó tarde al final del día)
    if (Math.abs(diffToOutMinutes) < Math.abs(diffToInMinutes) && 
        diffToOutMinutes >= -WINDOW_OUT_BEFORE && diffToOutMinutes <= WINDOW_OUT_AFTER) {
      // Construir metadata con información del dispositivo Hikvision
      const deviceMetadata: Record<string, any> = {};
      if (doorNo !== null && doorNo !== undefined) deviceMetadata.doorNo = doorNo;
      if (readerNo !== null && readerNo !== undefined) deviceMetadata.readerNo = readerNo;
      if (verifyMode !== null && verifyMode !== undefined) deviceMetadata.verifyMode = verifyMode;
      if (cardNo !== null && cardNo !== undefined) deviceMetadata.cardNo = cardNo;
      if (employeeNoString !== null && employeeNoString !== undefined) deviceMetadata.employeeNoString = employeeNoString;
      if (Object.keys(deviceMetadata).length > 0) {
        deviceMetadata.source = 'hikvision_webhook';
      }

      // Crear registro completo con check_in esperado y check_out del evento
      const { data: record, error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: recordDate,
          check_in: expectedCheckIn.toISOString(), // Usar hora esperada
          check_out: eventTimestamp.toISOString(),
          expected_check_in: expectedCheckInStr,
          expected_check_out: expectedCheckOutStr,
          late_minutes: 0, // Asumir que llegó a tiempo si usamos hora esperada
          event_uid: eventUid,
          tz: 'America/Tegucigalpa',
          tz_offset_minutes: -360,
          status: 'present',
          metadata: Object.keys(deviceMetadata).length > 0 ? deviceMetadata : null,
        })
        .select()
        .single();

      if (insertError && insertError.code !== '23505') {
        logger.error('[FIXED EMPLOYEE] Error creating complete record', insertError, {
          companyId,
          employeeId: employee.id,
        });
      } else {
        logger.info('[FIXED EMPLOYEE] Complete record created (late arrival)', {
          companyId,
          employeeId: employee.id,
          recordId: record?.id,
          eventUid,
        });
      }
      return;
    }

    // Evento fuera de ventanas
    logger.warn('[FIXED EMPLOYEE] Event outside time windows, ignoring', {
      companyId,
      employeeId: employee.id,
      diffToInMinutes,
      diffToOutMinutes,
      eventTimestamp: eventTimestamp.toISOString(),
    });
    return;
  }

  // REGLA 2: Hay registro abierto (con check_in pero sin check_out)
  // Cierre de jornada: soporta check-out al día siguiente (cruce medianoche)
  if (openRecord) {
    const openCheckIn = new Date(openRecord.check_in);
    const diffMs = eventTimestamp.getTime() - openCheckIn.getTime();

    if (diffMs > 0 && diffMs <= MAX_SHIFT_MS) {
      const updateData: any = {
        check_out: eventTimestamp.toISOString(),
        expected_check_out: expectedCheckOutStr,
        early_departure_minutes: bestFit.earlyDepartureMinutes ?? 0,
        updated_at: new Date().toISOString(),
      };
      const deviceMetadata: Record<string, any> = {};
      if (doorNo != null) deviceMetadata.doorNo = doorNo;
      if (readerNo != null) deviceMetadata.readerNo = readerNo;
      if (verifyMode != null) deviceMetadata.verifyMode = verifyMode;
      if (cardNo != null) deviceMetadata.cardNo = cardNo;
      if (employeeNoString != null) deviceMetadata.employeeNoString = employeeNoString;
      if (Object.keys(deviceMetadata).length > 0) {
        deviceMetadata.source = 'hikvision_webhook';
        const existingMetadata = (openRecord as any).metadata || {};
        Object.assign(deviceMetadata, existingMetadata);
        updateData.metadata = deviceMetadata;
      }

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update(updateData)
        .eq('id', openRecord.id);

      if (updateError) {
        logger.error('[FIXED EMPLOYEE] Error updating check_out', updateError, {
          companyId,
          employeeId: employee.id,
          recordId: openRecord.id,
        });
      } else {
        logger.info('[FIXED EMPLOYEE] Check_out recorded (cruce medianoche)', {
          companyId,
          employeeId: employee.id,
          recordId: openRecord.id,
          eventUid,
          recordDate: openRecord.date,
        });
      }
      return;
    }

    if (diffMs > MAX_SHIFT_MS) {
      logger.warn('[FIXED EMPLOYEE] Open record exceeded 30h, fallback Capa Base', {
        companyId,
        employeeId: employee.id,
        openRecordId: openRecord.id,
      });
      await handleFixedEmployeeNoSchedule(
        employee,
        eventTimestamp,
        recordDate,
        eventUid,
        companyId,
        doorNo,
        readerNo,
        verifyMode,
        cardNo,
        employeeNoString,
        { horario_no_detectado: true, razon: 'distancia_horario_excedida' }
      );
      return;
    }

    if (diffMs <= 0) {
      logger.warn('[FIXED EMPLOYEE] Event out of order (before check_in), ignoring', {
        companyId,
        employeeId: employee.id,
        openRecordId: openRecord.id,
        eventUid,
      });
      return;
    }
  }
}

/**
 * Maneja eventos de empleados por hora (pay_type = 'hourly')
 * La primera marca es entrada, la siguiente es salida (dentro de 30 horas)
 */
async function handleHourlyEmployeeEvent(
  employee: any,
  root: any,
  acs: any,
  eventTimestamp: Date,
  recordDate: string,
  eventUid: string,
  companyId: string,
  doorNo: any,
  readerNo: any,
  verifyMode: any,
  cardNo: any,
  employeeNoString: any
) {
  const supabase = createAdminClient();

  // Constante de ventana máxima para un turno (30 horas)
  const MAX_SHIFT_HOURS = 30;
  const MAX_SHIFT_MS = MAX_SHIFT_HOURS * 60 * 60 * 1000;

  // Buscar último registro abierto del empleado (sin check_out)
  const { data: openRecord } = await supabase
    .from('attendance_records')
    .select('id, check_in, check_out, date')
    .eq('employee_id', employee.id)
    .is('check_out', null)
    .order('check_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  logger.debug('[HOURLY EMPLOYEE] Event processing', {
    companyId,
    employeeId: employee.id,
    recordDate,
    hasOpenRecord: !!openRecord,
    openRecordDate: openRecord?.date,
    eventTimestamp: eventTimestamp.toISOString(),
  });

  const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

  // REGLA 1: No hay registro abierto → crear nuevo check_in
  if (!openRecord) {
    const { data: recentCheckIn } = await supabase
      .from('attendance_records')
      .select('id, check_in')
      .eq('employee_id', employee.id)
      .eq('date', recordDate)
      .not('check_in', 'is', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCheckIn) {
      const recentTime = new Date(recentCheckIn.check_in).getTime();
      if (Math.abs(eventTimestamp.getTime() - recentTime) <= DUPLICATE_WINDOW_MS) {
        logger.info('[HOURLY EMPLOYEE] Duplicado ignorado: check_in dentro de 15 min', {
          companyId,
          employeeId: employee.id,
          eventUid,
          diffMs: Math.abs(eventTimestamp.getTime() - recentTime),
        });
        return;
      }
    }

    // Construir metadata con información del dispositivo Hikvision
    const deviceMetadata: Record<string, any> = {};
    if (doorNo !== null && doorNo !== undefined) deviceMetadata.doorNo = doorNo;
    if (readerNo !== null && readerNo !== undefined) deviceMetadata.readerNo = readerNo;
    if (verifyMode !== null && verifyMode !== undefined) deviceMetadata.verifyMode = verifyMode;
    if (cardNo !== null && cardNo !== undefined) deviceMetadata.cardNo = cardNo;
    if (employeeNoString !== null && employeeNoString !== undefined) deviceMetadata.employeeNoString = employeeNoString;
    if (Object.keys(deviceMetadata).length > 0) {
      deviceMetadata.source = 'hikvision_webhook';
    }

    const { data: record, error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        employee_id: employee.id,
        date: recordDate,
        check_in: eventTimestamp.toISOString(),
        event_uid: eventUid,
        tz: 'America/Tegucigalpa',
        tz_offset_minutes: -360,
        status: 'present',
        metadata: Object.keys(deviceMetadata).length > 0 ? deviceMetadata : null,
      })
      .select()
      .single();

    if (insertError && insertError.code !== '23505') {
      logger.error('[HOURLY EMPLOYEE] Error creating check_in record', insertError, {
        companyId,
        employeeId: employee.id,
      });
    } else {
      logger.info('[HOURLY EMPLOYEE] Check_in recorded', {
        companyId,
        employeeId: employee.id,
        recordId: record?.id,
        eventUid,
      });
    }
    return;
  }

  // REGLA 2: Hay registro abierto → calcular diferencia
  const openRecordCheckIn = new Date(openRecord.check_in);
  const diffMs = eventTimestamp.getTime() - openRecordCheckIn.getTime();

  logger.debug('[HOURLY EMPLOYEE] Time difference calculation', {
    companyId,
    employeeId: employee.id,
    openRecordId: openRecord.id,
    openRecordCheckIn: openRecordCheckIn.toISOString(),
    eventTimestamp: eventTimestamp.toISOString(),
    diffMs,
    diffHours: diffMs / (60 * 60 * 1000),
  });

  // Si la diferencia es positiva y está dentro de la ventana de 30 horas
  if (diffMs > 0 && diffMs <= MAX_SHIFT_MS) {
    // Construir metadata con información del dispositivo Hikvision
    const deviceMetadata: Record<string, any> = {};
    if (doorNo !== null && doorNo !== undefined) deviceMetadata.doorNo = doorNo;
    if (readerNo !== null && readerNo !== undefined) deviceMetadata.readerNo = readerNo;
    if (verifyMode !== null && verifyMode !== undefined) deviceMetadata.verifyMode = verifyMode;
    if (cardNo !== null && cardNo !== undefined) deviceMetadata.cardNo = cardNo;
    if (employeeNoString !== null && employeeNoString !== undefined) deviceMetadata.employeeNoString = employeeNoString;
    if (Object.keys(deviceMetadata).length > 0) {
      deviceMetadata.source = 'hikvision_webhook';
      // Preservar metadata existente si existe
      const existingMetadata = (openRecord as any).metadata || {};
      Object.assign(deviceMetadata, existingMetadata);
    }

    // Actualizar registro con check_out
    const updateData: any = {
      check_out: eventTimestamp.toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (Object.keys(deviceMetadata).length > 0) {
      updateData.metadata = deviceMetadata;
    }

    const { error: updateError } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', openRecord.id);

    if (updateError) {
      logger.error('[HOURLY EMPLOYEE] Error updating check_out', updateError, {
        companyId,
        employeeId: employee.id,
        recordId: openRecord.id,
      });
    } else {
      logger.info('[HOURLY EMPLOYEE] Check_out recorded', {
        companyId,
        employeeId: employee.id,
        recordId: openRecord.id,
        eventUid,
        shiftDurationHours: diffMs / (60 * 60 * 1000),
      });
    }
    return;
  }

  // Si diffMs <= 0 (evento anterior o igual al check_in)
  if (diffMs <= 0) {
    logger.warn('[HOURLY EMPLOYEE] Event out of order, ignoring', {
      companyId,
      employeeId: employee.id,
      openRecordId: openRecord.id,
      diffMs,
      eventUid,
    });
    return;
  }

  // Si diffMs > MAX_SHIFT_MS (pasaron más de 30 horas)
  // Cerrar registro huérfano y crear nuevo check_in
  logger.warn('[HOURLY EMPLOYEE] Shift exceeded 30 hours, closing orphan record', {
    companyId,
    employeeId: employee.id,
    openRecordId: openRecord.id,
    diffHours: diffMs / (60 * 60 * 1000),
  });

  // Cerrar registro huérfano (opcional: puedes dejarlo abierto o cerrarlo con hora estimada)
  // Por ahora, lo dejamos abierto y creamos un nuevo check_in
  // Construir metadata con información del dispositivo Hikvision
  const deviceMetadata: Record<string, any> = {};
  if (doorNo !== null && doorNo !== undefined) deviceMetadata.doorNo = doorNo;
  if (readerNo !== null && readerNo !== undefined) deviceMetadata.readerNo = readerNo;
  if (verifyMode !== null && verifyMode !== undefined) deviceMetadata.verifyMode = verifyMode;
  if (cardNo !== null && cardNo !== undefined) deviceMetadata.cardNo = cardNo;
  if (employeeNoString !== null && employeeNoString !== undefined) deviceMetadata.employeeNoString = employeeNoString;
  if (Object.keys(deviceMetadata).length > 0) {
    deviceMetadata.source = 'hikvision_webhook';
  }

  const { data: newRecord, error: insertError } = await supabase
    .from('attendance_records')
    .insert({
      employee_id: employee.id,
      date: recordDate,
      check_in: eventTimestamp.toISOString(),
      event_uid: eventUid,
      tz: 'America/Tegucigalpa',
      tz_offset_minutes: -360,
      status: 'present',
      metadata: Object.keys(deviceMetadata).length > 0 ? deviceMetadata : null,
    })
    .select()
    .single();

  if (insertError && insertError.code !== '23505') {
    logger.error('[HOURLY EMPLOYEE] Error creating new check_in after orphan', insertError, {
      companyId,
      employeeId: employee.id,
    });
      } else {
    logger.info('[HOURLY EMPLOYEE] New check_in created after orphan record', {
      companyId,
      employeeId: employee.id,
      newRecordId: newRecord?.id,
      orphanRecordId: openRecord.id,
      eventUid,
    });
  }
}

/** Company ID que usa flujo de 4 marcas: entrada, inicio almuerzo, fin almuerzo, salida. */
const FOUR_MARKS_COMPANY_ID = 'c4692355-9b0c-4a2c-8283-7c0b872b6831';

/**
 * Maneja eventos para cliente con 4 marcas biométricas por día:
 * 1ª = entrada, 2ª = inicio almuerzo, 3ª = fin almuerzo, 4ª = salida.
 * El orden del evento define el slot; el almuerzo no es hora fija.
 */
async function handleFourMarksEmployeeEvent(
  employee: any,
  root: any,
  acs: any,
  eventTimestamp: Date,
  recordDate: string,
  eventUid: string,
  companyId: string,
  doorNo: any,
  readerNo: any,
  verifyMode: any,
  cardNo: any,
  employeeNoString: any
) {
  const supabase = createAdminClient();

  const deviceMetadata: Record<string, any> = {};
  if (doorNo != null) deviceMetadata.doorNo = doorNo;
  if (readerNo != null) deviceMetadata.readerNo = readerNo;
  if (verifyMode != null) deviceMetadata.verifyMode = verifyMode;
  if (cardNo != null) deviceMetadata.cardNo = cardNo;
  if (employeeNoString != null) deviceMetadata.employeeNoString = employeeNoString;
  if (Object.keys(deviceMetadata).length > 0) deviceMetadata.source = 'hikvision_webhook';

  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id, check_in, lunch_start, lunch_end, check_out, metadata')
    .eq('employee_id', employee.id)
    .eq('date', recordDate)
    .maybeSingle();

  if (!existing) {
    const { data: record, error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        employee_id: employee.id,
        date: recordDate,
        check_in: eventTimestamp.toISOString(),
        event_uid: eventUid,
        tz: 'America/Tegucigalpa',
        tz_offset_minutes: -360,
        status: 'present',
        metadata: Object.keys(deviceMetadata).length > 0 ? deviceMetadata : null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        logger.info('[FOUR_MARKS] Duplicate first event (idempotency), ignoring', {
          companyId,
          employeeId: employee.id,
          recordDate,
          eventUid,
        });
      } else {
        logger.error('[FOUR_MARKS] Error creating check_in record', insertError, {
          companyId,
          employeeId: employee.id,
          recordDate,
        });
      }
    } else {
      logger.info('[FOUR_MARKS] 1ª marca: entrada registrada', {
        companyId,
        employeeId: employee.id,
        recordId: record?.id,
        eventUid,
      });
    }
    return;
  }

  const meta = { ...((existing.metadata as Record<string, unknown>) || {}), ...deviceMetadata };
  const updateBase: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    metadata: Object.keys(meta).length > 0 ? meta : null,
  };

  if (existing.lunch_start == null) {
    const { error: updateError } = await supabase
      .from('attendance_records')
      .update({ ...updateBase, lunch_start: eventTimestamp.toISOString() })
      .eq('id', existing.id);
    if (updateError) {
      logger.error('[FOUR_MARKS] Error updating lunch_start', updateError, {
        companyId,
        employeeId: employee.id,
        recordId: existing.id,
      });
    } else {
      logger.info('[FOUR_MARKS] 2ª marca: inicio almuerzo registrado', {
        companyId,
        employeeId: employee.id,
        recordId: existing.id,
        eventUid,
      });
    }
    return;
  }

  if (existing.lunch_end == null) {
    const { error: updateError } = await supabase
      .from('attendance_records')
      .update({ ...updateBase, lunch_end: eventTimestamp.toISOString() })
      .eq('id', existing.id);
    if (updateError) {
      logger.error('[FOUR_MARKS] Error updating lunch_end', updateError, {
        companyId,
        employeeId: employee.id,
        recordId: existing.id,
      });
    } else {
      logger.info('[FOUR_MARKS] 3ª marca: fin almuerzo registrado', {
        companyId,
        employeeId: employee.id,
        recordId: existing.id,
        eventUid,
      });
    }
    return;
  }

  if (existing.check_out == null) {
    const { error: updateError } = await supabase
      .from('attendance_records')
      .update({ ...updateBase, check_out: eventTimestamp.toISOString() })
      .eq('id', existing.id);
    if (updateError) {
      logger.error('[FOUR_MARKS] Error updating check_out', updateError, {
        companyId,
        employeeId: employee.id,
        recordId: existing.id,
      });
    } else {
      logger.info('[FOUR_MARKS] 4ª marca: salida registrada', {
        companyId,
        employeeId: employee.id,
        recordId: existing.id,
        eventUid,
      });
    }
    return;
  }

  logger.warn('[FOUR_MARKS] Todas las marcas ya registradas, ignorando evento', {
    companyId,
    employeeId: employee.id,
    recordId: existing.id,
    eventUid,
  });
}

/**
 * Procesa evento de acceso: crea registro de asistencia
 */
async function processAccessEvent(
  root: any,
  acs: any,
  companyId: string
) {
  logger.info('[ACCESS EVENT] Starting processAccessEvent', {
    companyId,
    hasRoot: !!root,
    hasAcs: !!acs,
    rootKeys: root ? Object.keys(root) : [],
    acsKeys: acs ? Object.keys(acs) : [],
    eventType: root?.eventType,
    eventState: root?.eventState,
    rootFull: JSON.stringify(root, null, 2),
    acsFull: acs ? JSON.stringify(acs, null, 2) : null,
  });
  
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

  logger.info('[ACCESS EVENT] Employee ID extraction attempt', {
    companyId,
    'acs.employeeNoString': acs?.employeeNoString,
    'acs.employeeNo': acs?.employeeNo,
    'acs.cardNo': acs?.cardNo,
    'acs.employeeNoHex': acs?.employeeNoHex,
    'acs.credentialNo': acs?.credentialNo,
    'acs.personNo': acs?.personNo,
    'root.employeeNoString': root?.employeeNoString,
    'root.employeeNo': root?.employeeNo,
    'root.cardNo': root?.cardNo,
    rawId,
    rawIdType: typeof rawId,
  });

  // Campos adicionales del Access Control Event (según manual)
  const doorNo = acs?.doorNo ?? root?.doorNo ?? null;
  const readerNo = acs?.readerNo ?? root?.readerNo ?? null;
  const verifyMode = acs?.currentVerifyMode ?? root?.currentVerifyMode ?? root?.verifyMode ?? null;
  const cardNo = acs?.cardNo ?? root?.cardNo ?? null;
  const employeeNoString = acs?.employeeNoString ?? root?.employeeNoString ?? null;

  // Log campos extraídos para debugging
  logger.info('[ACCESS EVENT] Extracted Access Control fields', {
    companyId,
    doorNo,
    readerNo,
    verifyMode,
    cardNo,
    employeeNoString,
    rawId,
    hasAcs: !!acs,
    acsKeys: acs ? Object.keys(acs) : [],
    rootKeys: Object.keys(root),
    acsFull: acs ? JSON.stringify(acs) : null,
    rootFull: JSON.stringify(root),
  });

  const normalizedId = normalizeIdentifier(rawId);

  if (!normalizedId) {
    // Log FULL payload para diagnóstico: dispositivos fingerprint-only pueden enviar campos distintos
    logger.warn('[ACCESS EVENT] No employee identifier found - full payload for debugging', {
      companyId,
      rawId,
      acsKeys: acs ? Object.keys(acs) : [],
      rootKeys: root ? Object.keys(root) : [],
      acsFull: acs ? JSON.stringify(acs) : null,
      rootFull: root ? JSON.stringify(root) : null,
      hint: 'Verificar que el dispositivo tiene Employee No configurado para cada usuario. Campos soportados: employeeNoString, employeeNo, cardNo, employeeNoHex, credentialNo, personNo',
    });
    return;
  }

  logger.info('[ACCESS EVENT] Employee identifier normalized', {
    companyId,
    rawId,
    normalizedId,
  });

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

  // Buscar empleado con work_schedule_id y pay_type
      let { data: employee, error: employeeError } = await supabase
        .from('employees')
    .select('id, company_id, work_schedule_id, dni, pay_type')
    .eq('company_id', companyId)
    .eq('dni', normalizedId)
        .eq('status', 'active')
        .single();

  logger.info('[ACCESS EVENT] Employee search - exact match', {
    companyId,
    normalizedId,
    found: !!employee,
    error: employeeError?.message,
    employeeId: employee?.id,
  });

  // Si no hay match exacto, intentar búsqueda flexible
      if (employeeError || !employee) {
    logger.info('[ACCESS EVENT] Trying flexible search', {
      companyId,
      normalizedId,
      exactMatchError: employeeError?.message,
    });

    const { data: allEmployees } = await supabase
          .from('employees')
      .select('id, company_id, work_schedule_id, dni, pay_type')
      .eq('company_id', companyId)
          .eq('status', 'active');

    if (allEmployees) {
      logger.info('[ACCESS EVENT] Flexible search - checking employees', {
        companyId,
        normalizedId,
        totalEmployees: allEmployees.length,
        employeeDnis: allEmployees.map(emp => ({
          id: emp.id,
          dni: emp.dni,
          normalized: normalizeIdentifier(emp.dni),
          matches: normalizeIdentifier(emp.dni) === normalizedId,
        })),
      });

      employee = allEmployees.find(emp => {
        const empNormalized = normalizeIdentifier(emp.dni);
        return empNormalized === normalizedId;
      }) || null;

      if (employee) {
        logger.info('[ACCESS EVENT] Employee found via flexible search', {
          companyId,
          employeeId: employee.id,
          dni: employee.dni,
          normalizedId,
        });
      }
    }
  }

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

  // Calcular fecha del registro usando hora local de Honduras
  // eventTimestamp ya está normalizado (UTC interno que representa hora de Honduras)
  const eventDate = hondurasTime.date; // Fecha en formato YYYY-MM-DD en hora de Honduras
  const todayDate = getTodayInHonduras();
  
  // Comparar fechas (no timestamps) para decidir si usar fecha del evento o hoy
  // Si el evento es de hace más de 24 horas, usar su fecha; si no, usar hoy
  const hoursDiff = (nowInHonduras().getTime() - eventTimestamp.getTime()) / (1000 * 60 * 60);
  const recordDate = hoursDiff > 24 ? eventDate : todayDate;
  
  logger.debug('[ACCESS EVENT] Date calculation', {
    companyId,
    eventDateHonduras: eventDate,
    todayDateHonduras: todayDate,
    hoursDiff,
    recordDate,
    eventTimestamp: eventTimestamp.toISOString(),
  });

  // Cliente específico: 4 marcas por día (entrada, inicio almuerzo, fin almuerzo, salida)
  if (companyId === FOUR_MARKS_COMPANY_ID) {
    await handleFourMarksEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
    return;
  }

  // Ramificar según tipo de pago del empleado
  const payType = (employee as any).pay_type || 'fixed'; // Default a 'fixed' si no existe
  
  logger.debug('[ACCESS EVENT] Routing by pay_type', {
    companyId,
              employeeId: employee.id,
    payType,
    normalizedId,
  });

  if (payType === 'fixed') {
    await handleFixedEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
  } else if (payType === 'hourly') {
    await handleHourlyEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
          } else {
    logger.warn('[ACCESS EVENT] Unknown pay_type, defaulting to fixed', {
      companyId,
      employeeId: employee.id,
      payType,
    });
    // Default a fixed si pay_type es desconocido
    await handleFixedEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
  }
  
  logger.info('[ACCESS EVENT] processAccessEvent completed', {
    companyId,
    normalizedId,
    eventUid,
  });
}

/**
 * Procesa marca de asistencia (usado por webhook ZKTeco y otros integradores).
 * Encapsula la ramificación por pay_type y FOUR_MARKS.
 */
export async function processAttendanceMark(params: {
  employee: { id: string; company_id: string; work_schedule_id: string | null; dni: string; pay_type: string | null };
  eventTimestamp: Date;
  recordDate: string;
  eventUid: string;
  companyId: string;
  identifier: string;
}): Promise<void> {
  const { employee, eventTimestamp, recordDate, eventUid, companyId, identifier } = params;
  const root = { dateTime: eventTimestamp.toISOString() };
  const acs = {
    doorNo: null,
    readerNo: null,
    currentVerifyMode: 'fingerprint',
    employeeNoString: identifier,
  };
  const doorNo = null;
  const readerNo = null;
  const verifyMode = 'fingerprint';
  const cardNo = null;
  const employeeNoString = identifier;

  if (companyId === FOUR_MARKS_COMPANY_ID) {
    await handleFourMarksEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
    return;
  }

  const payType = (employee as { pay_type?: string }).pay_type || 'fixed';
  if (payType === 'fixed') {
    await handleFixedEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
  } else if (payType === 'hourly') {
    await handleHourlyEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
  } else {
    await handleFixedEmployeeEvent(
      employee,
      root,
      acs,
      eventTimestamp,
      recordDate,
      eventUid,
      companyId,
      doorNo,
      readerNo,
      verifyMode,
      cardNo,
      employeeNoString
    );
  }
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
    // Log incoming request metadata

    

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
