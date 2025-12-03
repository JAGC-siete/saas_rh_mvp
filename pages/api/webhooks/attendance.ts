import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { createClient } from '../../../lib/supabase/server';
import { logError, logger } from '../../../lib/logger';
import { getTodayInHonduras, nowInHonduras } from '../../../lib/timezone';
import fs from 'fs';

// Desactivamos el parser de body de Next.js para que formidable pueda procesar el stream.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Lista de posibles nombres de eventos que consideraremos como una marcación de asistencia válida.
const VALID_AUTHENTICATION_EVENTS = [
  'faceAuthentication', // Autenticado mediante rostro
  'cardAndFaceAuthentication', // Si se requiere tarjeta + rostro
  'AccessControllerEvent', // A veces el tipo de evento principal viene con este nombre
];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { company_id } = req.query;

  if (!company_id || typeof company_id !== 'string') {
    logger.warn('[ATTENDANCE WEBHOOK] Missing company_id', { query: req.query });
    return res.status(400).json({ error: 'company_id is required' });
  }

  try {
    // Log incoming request metadata
    logger.info('[ATTENDANCE WEBHOOK] Request received', {
      companyId: company_id,
      method: req.method,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      contentLength: req.headers['content-length'],
      hasBody: !!req.body,
    });

    // Configure formidable with more verbose options
    const form = formidable({
      keepExtensions: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
    });

    // Parse form and capture any errors
    let fields: any;
    let files: any;
    
    try {
      // Parse with formidable - it will handle named fields
      // NOTE: Formidable v3 doesn't easily capture unnamed JSON parts in multipart
      // For Hikvision EventNotificationAlert format (unnamed JSON part), we would need
      // to use busboy directly or implement custom multipart parser
      // For MVP, we handle named fields and log when empty to diagnose
      [fields, files] = await form.parse(req);
      
    } catch (parseError) {
      logger.error('[ATTENDANCE WEBHOOK] Formidable parse error', parseError as Error, {
        companyId: company_id,
        contentType: req.headers['content-type'],
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to parse form data',
        details: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }
    
    // Note: Formidable v3 may not capture unnamed JSON parts in multipart
    // If fields are empty but we have multipart, the device is likely sending
    // EventNotificationAlert in a part without field name - this requires
    // a different parser (busboy) which we'll add if needed

    // Log all form fields received (for debugging)
    logger.info('[ATTENDANCE WEBHOOK] Form parsing completed', {
      companyId: company_id,
      fieldNames: Object.keys(fields),
      fieldCount: Object.keys(fields).length,
      fileCount: files ? Object.keys(files).length : 0,
      fieldCounts: Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value.length : 1])
      ),
      hasFiles: files && Object.keys(files).length > 0,
      allFieldKeys: Object.keys(fields),
      note: fields && Object.keys(fields).length === 0 ? 'No fields found - device may be sending unnamed JSON part (Hikvision EventNotificationAlert format)' : undefined,
    });

    // Extract event data from multiple possible formats:
    // 1. Field named "AccessControllerEvent" (curl test format)
    // 2. JSON part in files (Hikvision EventNotificationAlert format - unnamed part)
    // 3. Other field names as fallback
    let eventDataString: string | null = null;

    // Step 1: Try field-based extraction (curl test format and named fields)
    eventDataString = fields.AccessControllerEvent?.[0]
      || fields.accessControllerEvent?.[0]
      || fields.event?.[0]
      || fields.data?.[0]
      || fields.json?.[0]
      || (Object.keys(fields).length > 0 ? fields[Object.keys(fields)[0]]?.[0] : null);
    
    // Step 2: If no field found, check files for JSON part (Hikvision EventNotificationAlert format)
    // Formidable treats unnamed parts as "files"
    if (!eventDataString && files && Object.keys(files).length > 0) {
      // Look through all files - try to find JSON content
      // Hikvision sends unnamed JSON parts that formidable classifies as files
      for (const fileKey of Object.keys(files)) {
        const fileArray = files[fileKey];
        if (Array.isArray(fileArray) && fileArray.length > 0) {
          const file = fileArray[0];
          
          // Check if it might be JSON:
          // - Has JSON mimetype
          // - Or is small enough to be JSON (Hikvision events are typically < 1KB)
          // - Or has no extension (unnamed part)
          const mightBeJson = file.mimetype === 'application/json' 
            || file.mimetype === 'text/json'
            || file.originalFilename?.endsWith('.json')
            || (!file.originalFilename && file.size && file.size < 5000); // Small unnamed file likely JSON
          
          if (mightBeJson && file.filepath) {
            try {
              logger.info('[ATTENDANCE WEBHOOK] Found potential JSON file part, reading content', {
                companyId: company_id,
                fileKey: fileKey,
                mimetype: file.mimetype,
                size: file.size,
                originalFilename: file.originalFilename || '(unnamed)',
              });
              
              // Read file content
              const fileContent = fs.readFileSync(file.filepath, 'utf-8');
              
              // Check if it starts like JSON
              const trimmed = fileContent.trim();
              if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                // Try to parse as JSON
                const parsed = JSON.parse(fileContent);
                
                logger.info('[ATTENDANCE WEBHOOK] Successfully parsed JSON from file part', {
                  companyId: company_id,
                  rootKeys: Object.keys(parsed),
                  hasEventNotificationAlert: !!parsed.EventNotificationAlert,
                  hasAccessControllerEvent: !!parsed.AccessControllerEvent,
                });
                
                // Extract AccessControllerEvent from EventNotificationAlert wrapper
                if (parsed.EventNotificationAlert?.AccessControllerEvent) {
                  logger.info('[ATTENDANCE WEBHOOK] Extracted AccessControllerEvent from EventNotificationAlert in file part', {
                    companyId: company_id,
                  });
                  eventDataString = JSON.stringify(parsed.EventNotificationAlert.AccessControllerEvent);
                } else if (parsed.AccessControllerEvent) {
                  // Direct AccessControllerEvent
                  eventDataString = JSON.stringify(parsed.AccessControllerEvent);
                } else if (parsed.eventType === 'AccessControllerEvent' && parsed.AccessControllerEvent) {
                  // eventType is AccessControllerEvent and has nested AccessControllerEvent node
                  eventDataString = JSON.stringify(parsed.AccessControllerEvent);
                } else if (parsed.eventType) {
                  // Root object is the event (heartbeat, etc.)
                  eventDataString = fileContent;
                }
              }
              
              // Clean up temp file
              try {
                fs.unlinkSync(file.filepath);
              } catch (unlinkError) {
                // Ignore cleanup errors
              }
              
              if (eventDataString) break; // Found what we need
            } catch (fileError) {
              // Not JSON or parse error - continue to next file
              logger.debug('[ATTENDANCE WEBHOOK] File part is not valid JSON, skipping', {
                companyId: company_id,
                fileKey: fileKey,
                error: fileError instanceof Error ? fileError.message : String(fileError),
              });
            }
          }
        }
      }
    }
    
    // Step 3: If we found a field, check if it's EventNotificationAlert format and extract AccessControllerEvent
    if (eventDataString) {
      try {
        const parsed = JSON.parse(eventDataString);
        // Check if it's EventNotificationAlert wrapper format
        if (parsed.EventNotificationAlert?.AccessControllerEvent) {
          logger.info('[ATTENDANCE WEBHOOK] Found EventNotificationAlert wrapper in field, extracting AccessControllerEvent', {
            companyId: company_id,
          });
          eventDataString = JSON.stringify(parsed.EventNotificationAlert.AccessControllerEvent);
        } else if (parsed.AccessControllerEvent) {
          // Direct AccessControllerEvent in field
          eventDataString = JSON.stringify(parsed.AccessControllerEvent);
        }
        // Otherwise use the field as-is
      } catch {
        // Not JSON, use as-is
      }
    }

    if (!eventDataString) {
      // Log detailed information about what was received
      const allFieldsData = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [
          key,
          Array.isArray(value) 
            ? (value[0]?.substring?.(0, 500) || `[Array of ${value.length} items]`)
            : (String(value)?.substring?.(0, 500) || String(value))
        ])
      );

      logger.warn('[ATTENDANCE WEBHOOK] Empty event received - no AccessControllerEvent found', {
        companyId: company_id,
        availableFields: Object.keys(fields),
        fieldCount: Object.keys(fields).length,
        allFieldsData: allFieldsData,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        hint: 'Device may be sending: (1) empty heartbeat (normal), (2) XML format (not yet supported), (3) Hikvision EventNotificationAlert format with unnamed JSON part (check files array), or (4) data in unexpected format',
      });
      return res.status(200).json({ success: true, message: 'Empty event received' });
    }

    // Log raw event data (truncated for security)
    logger.info('[ATTENDANCE WEBHOOK] Event data extracted', {
      companyId: company_id,
      dataLength: eventDataString.length,
      dataPreview: eventDataString.substring(0, 500),
      source: 'form field',
      isJSON: eventDataString.trim().startsWith('{') || eventDataString.trim().startsWith('['),
    });

    // Parsear JSON con manejo de errores específico
    let eventData: any;
    try {
      eventData = JSON.parse(eventDataString);
      logger.debug('[ATTENDANCE WEBHOOK] Successfully parsed JSON', {
        companyId: company_id,
        eventKeys: Object.keys(eventData),
        eventType: eventData.eventType,
      });
    } catch (parseError) {
      // Check if it might be XML (Hikvision can send XML if parameterFormatType=XML)
      if (eventDataString.trim().startsWith('<?xml') || eventDataString.trim().startsWith('<')) {
        logger.warn('[ATTENDANCE WEBHOOK] Received XML format (not yet supported)', {
          companyId: company_id,
          xmlPreview: eventDataString.substring(0, 500),
          hint: 'Device is sending XML format. JSON format is required. Check device parameterFormatType setting.',
        });
        return res.status(200).json({ 
          success: false, 
          message: 'XML format received but not yet supported. Device must use JSON format.',
          hint: 'Check device parameterFormatType setting in HTTP Listening configuration',
        });
      }
      
      logger.error(`[ATTENDANCE] Failed to parse JSON event data`, parseError as Error, {
        companyId: company_id,
        rawData: eventDataString?.substring(0, 1000), // Primeros 1000 caracteres para debugging
        dataLength: eventDataString?.length,
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format in event data' 
      });
    }

    const eventType = eventData.eventType;

    // Intentar extraer el DNI del empleado de diferentes campos posibles
    // Según manual Hikvision ISAPI, AccessControllerEvent puede incluir:
    // - cardNo (número de tarjeta/DNI)
    // - employeeNoString (número de empleado como string)
    // - employeeNo (número de empleado)
    // - name (nombre del empleado)
    // - majorEventType (tipo de evento principal)
    const employeeDNI = eventData.employeeNoString 
      || eventData.employeeNo 
      || eventData.employeeNoHex
      || eventData.dni 
      || eventData.employee_id
      || eventData.cardNo // Campo estándar según manual Hikvision ISAPI
      || eventData.cardNumber; // Variante alternativa

    // Normalizar DNI: remover espacios, guiones, y padding de ceros a la izquierda
    const normalizeDNI = (dni: string | number | undefined): string | undefined => {
      if (!dni) return undefined;
      const dniStr = String(dni).trim().replace(/[\s-]/g, '');
      // Remover ceros a la izquierda, pero mantener al menos un dígito
      return dniStr.replace(/^0+/, '') || dniStr;
    };

    const normalizedDNI = normalizeDNI(employeeDNI);

    // Si es un heartbeat sin datos de empleado (DNI), ignorarlo para evitar log flooding
    // Los heartbeats son normales y esperados - solo confirman que el dispositivo está conectado
    if (eventType === 'heartBeat' && !normalizedDNI) {
      logger.info('[ATTENDANCE WEBHOOK] Heartbeat received (normal - device connectivity check)', {
        companyId: company_id,
        eventType: eventType,
        note: 'Heartbeats are expected. For attendance records, device must send AccessControllerEvent with employee data.',
      });
      return res.status(200).json({ success: true, message: 'Heartbeat acknowledged' });
    }

    // Si es un heartbeat CON datos de empleado, procesarlo como asistencia
    if (eventType === 'heartBeat' && normalizedDNI) {
      logger.info('--- HIKVISION HEARTBEAT WITH EMPLOYEE DATA ---', {
        companyId: company_id,
        originalDNI: employeeDNI,
        normalizedDNI: normalizedDNI,
        parsedEventData: eventData,
      });
    } else if (eventType !== 'heartBeat') {
      // Si no es un heartbeat, lo registramos para depuración.
      // AccessControllerEvent real incluye: cardNo, name, majorEventType, etc.
      logger.info('--- HIKVISION EVENT RECEIVED (NON-HEARTBEAT) ---', {
        companyId: company_id,
        eventType: eventType,
        originalDNI: employeeDNI,
        normalizedDNI: normalizedDNI,
        hasCardNo: !!eventData.cardNo,
        hasEmployeeNo: !!eventData.employeeNo || !!eventData.employeeNoString,
        majorEventType: eventData.majorEventType,
        eventKeys: Object.keys(eventData),
        parsedEventData: eventData,
      });
    }

    // Procesar cualquier evento que tenga DNI (incluyendo heartbeats con datos de empleado)
    // o eventos de autenticación válidos
    if (normalizedDNI || VALID_AUTHENTICATION_EVENTS.includes(eventType)) {
      // Si no hay DNI pero es un evento de autenticación válido, no procesar
      if (!normalizedDNI) {
        logger.warn(`[ATTENDANCE] Auth event '${eventType}' received without employee ID (DNI)`, {
          companyId: company_id,
          eventType: eventType,
          parsedEventData: eventData,
        });
        return res.status(200).json({ success: false, message: 'Event lacked employee ID.' });
      }

      // Intentar extraer el timestamp del evento
      let eventTimestamp: Date;
      if (eventData.dateTime) {
        eventTimestamp = new Date(eventData.dateTime);
      } else if (eventData.timestamp) {
        // Si es un número (Unix timestamp), convertir a milisegundos
        const ts = typeof eventData.timestamp === 'number' 
          ? eventData.timestamp * 1000 
          : parseInt(eventData.timestamp, 10) * 1000;
        eventTimestamp = new Date(ts);
      } else {
        eventTimestamp = nowInHonduras();
      }

      // Validar que el timestamp sea válido
      if (isNaN(eventTimestamp.getTime())) {
        logger.warn(`[ATTENDANCE] Invalid timestamp received, using current time`, {
          companyId: company_id,
          dateTime: eventData.dateTime,
          timestamp: eventData.timestamp,
        });
        eventTimestamp = nowInHonduras();
      }

      // Usar createClient de lib/supabase/server que es resiliente y no crashea el servidor
      // Este cliente retorna un mock client si faltan variables de entorno, manteniendo el servidor vivo
      const supabase = createClient(req, res);

      // Buscar empleado por DNI y company_id
      // Intentar búsqueda exacta primero, luego búsqueda flexible (sin padding de ceros)
      logger.debug('[ATTENDANCE WEBHOOK] Searching for employee', {
        companyId: company_id,
        normalizedDNI: normalizedDNI,
        originalDNI: employeeDNI,
        searchType: 'exact',
      });

      let { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, company_id, work_schedule_id, dni')
        .eq('company_id', company_id as string)
        .eq('dni', normalizedDNI)
        .eq('status', 'active')
        .single();

      // Si no se encuentra con búsqueda exacta, intentar búsqueda flexible
      if (employeeError || !employee) {
        logger.info(`[ATTENDANCE] Exact DNI match not found, trying flexible search`, {
          companyId: company_id,
          normalizedDNI: normalizedDNI,
          originalDNI: employeeDNI,
          exactSearchError: employeeError?.message,
        });
        
        // Buscar todos los empleados de la compañía y hacer match manual
        const { data: allEmployees, error: allEmployeesError } = await supabase
          .from('employees')
          .select('id, company_id, work_schedule_id, dni')
          .eq('company_id', company_id as string)
          .eq('status', 'active');

        if (allEmployeesError) {
          logger.error(`[ATTENDANCE] Error fetching all employees for flexible search`, allEmployeesError, {
            companyId: company_id,
          });
        } else if (allEmployees) {
          logger.debug(`[ATTENDANCE] Flexible search: found ${allEmployees.length} active employees in company`, {
            companyId: company_id,
            employeeCount: allEmployees.length,
            sampleDNIs: allEmployees.slice(0, 5).map(emp => ({
              id: emp.id,
              dni: emp.dni,
              normalized: normalizeDNI(emp.dni),
            })),
          });

          // Buscar match flexible (normalizar DNIs de la BD también)
          employee = allEmployees.find(emp => {
            const empDNI = normalizeDNI(emp.dni);
            return empDNI === normalizedDNI;
          }) || null; // Si find() devuelve undefined, asigna null
          
          if (employee) {
            employeeError = null;
            logger.info(`[ATTENDANCE] Found employee with flexible DNI match`, {
              companyId: company_id,
              employeeId: employee.id,
              storedDNI: employee.dni,
              matchedDNI: normalizedDNI,
            });
          } else {
            logger.warn(`[ATTENDANCE] No employee match found in flexible search`, {
              companyId: company_id,
              normalizedDNI: normalizedDNI,
              totalEmployeesChecked: allEmployees.length,
              closestMatches: allEmployees
                .map(emp => {
                  const empNormalized = normalizeDNI(emp.dni);
                  const hasSimilarity = normalizedDNI && empNormalized
                    ? (empNormalized.includes(normalizedDNI) || normalizedDNI.includes(empNormalized))
                    : false;
                  return {
                    storedDNI: emp.dni,
                    normalized: empNormalized,
                    similarity: hasSimilarity,
                  };
                })
                .filter(m => m.similarity)
                .slice(0, 3),
            });
          }
        }
      } else {
        logger.debug(`[ATTENDANCE] Employee found with exact DNI match`, {
          companyId: company_id,
          employeeId: employee.id,
          storedDNI: employee.dni,
          matchedDNI: normalizedDNI,
        });
      }

      if (employeeError || !employee) {
        logger.warn(`[ATTENDANCE] Employee not found with DNI ${normalizedDNI} (original: ${employeeDNI}) for company ${company_id}`, {
          companyId: company_id,
          originalDNI: employeeDNI,
          normalizedDNI: normalizedDNI,
          eventType: eventType,
          error: employeeError?.message || 'Employee not found',
          errorCode: employeeError?.code,
          allEventData: eventData, // Log completo para debugging
          timestamp: eventData.dateTime || eventData.timestamp,
        });
        return res.status(200).json({ 
          success: false, 
          message: `Employee with DNI ${normalizedDNI} not found.`,
          receivedDNI: employeeDNI,
          normalizedDNI: normalizedDNI,
          hint: 'Verify employee exists in database with status=active and matching DNI',
        });
      }

      // Usar la fecha del timestamp del evento, no la fecha actual
      // Esto es importante si el evento ocurrió ayer o el dispositivo tiene desincronización
      const eventDate = eventTimestamp.toISOString().split('T')[0];
      const todayDate = getTodayInHonduras();
      
      // Si el evento es de hace más de 24 horas, usar la fecha del evento
      // Si es reciente (menos de 24 horas), usar la fecha de hoy
      const hoursDiff = (nowInHonduras().getTime() - eventTimestamp.getTime()) / (1000 * 60 * 60);
      const recordDate = hoursDiff > 24 ? eventDate : todayDate;
      
      logger.info(`[ATTENDANCE] Using date for record`, {
        eventDate: eventDate,
        todayDate: todayDate,
        hoursDiff: hoursDiff.toFixed(2),
        recordDate: recordDate,
      });
      
      // Convertir el timestamp del evento a ISO string (UTC)
      const checkInTimestamp = eventTimestamp.toISOString();

      // Insertar o actualizar el registro de asistencia
      // Si ya existe un registro para la fecha, actualizamos el check_in
      const { data: record, error: upsertError } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employee.id,
          date: recordDate, // Usar fecha calculada (evento o hoy)
          check_in: checkInTimestamp,
          tz: 'America/Tegucigalpa',
          tz_offset_minutes: -360,
          status: 'present',
        }, {
          onConflict: 'employee_id,date',
        })
        .select()
        .single();

      if (upsertError) {
        logger.error(`[ATTENDANCE] Failed to upsert attendance record`, upsertError, {
          companyId: company_id,
          employeeId: employee.id,
          employeeDNI: employeeDNI,
          normalizedDNI: normalizedDNI,
          eventType: eventType,
          recordDate: recordDate,
          checkInTimestamp: checkInTimestamp,
          errorDetails: upsertError.message,
          errorCode: upsertError.code,
        });
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to save attendance record.',
          details: upsertError.message,
        });
      }

      logger.info(`[SUCCESS] Recorded attendance for employee DNI ${normalizedDNI} (original: ${employeeDNI}) via event '${eventType}'`, {
        companyId: company_id,
        employeeId: employee.id,
        originalDNI: employeeDNI,
        normalizedDNI: normalizedDNI,
        storedDNI: employee.dni,
        eventType: eventType,
        recordId: record?.id,
        recordDate: recordDate,
        checkIn: checkInTimestamp,
        eventTimestamp: eventTimestamp.toISOString(),
      });

      return res.status(200).json({ success: true, message: 'Attendance recorded successfully' });

    } else {
      // Si es otro tipo de evento conocido pero no de asistencia (ej. "door open"), solo lo registramos.
      logger.info(`[ATTENDANCE WEBHOOK] Ignored non-attendance event of type '${eventType}'`, {
        companyId: company_id,
        eventType: eventType,
        hasDNI: !!normalizedDNI,
        normalizedDNI: normalizedDNI,
        isValidAuthEvent: VALID_AUTHENTICATION_EVENTS.includes(eventType),
        parsedEventData: eventData,
      });
      return res.status(200).json({ 
        success: true, 
        message: `Event type ${eventType} received and ignored`,
        reason: !normalizedDNI ? 'No employee DNI in event' : `Event type ${eventType} is not a valid attendance event`,
      });
    }
  } catch (error) {
    logError(error as Error, {
      additionalData: {
        company_id: company_id,
      },
      endpoint: '/api/webhooks/attendance',
    });
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred.',
    });
  }
};

export default handler;
