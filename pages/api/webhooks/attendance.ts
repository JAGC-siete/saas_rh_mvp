import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { logError, logger } from '../../../lib/logger';
import { getTodayInHonduras, nowInHonduras } from '../../../lib/timezone';
import { createAdminClient } from '../../../lib/supabase/server';

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
    const form = formidable({});
    const [fields] = await form.parse(req);

    const eventDataString = fields.AccessControllerEvent?.[0];
    if (!eventDataString) {
      logger.info('[ATTENDANCE WEBHOOK] Empty event received', { companyId: company_id });
      return res.status(200).json({ success: true, message: 'Empty event received' });
    }

    // Parsear JSON con manejo de errores específico
    let eventData: any;
    try {
      eventData = JSON.parse(eventDataString);
    } catch (parseError) {
      logger.error(`[ATTENDANCE] Failed to parse JSON event data`, parseError as Error, {
        companyId: company_id,
        rawData: eventDataString?.substring(0, 500), // Primeros 500 caracteres para debugging
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format in event data' 
      });
    }

    const eventType = eventData.eventType;

    // Intentar extraer el DNI del empleado de diferentes campos posibles
    // El dispositivo Hikvision puede usar diferentes nombres de campo según configuración
    const employeeDNI = eventData.employeeNoString 
      || eventData.employeeNo 
      || eventData.employeeNoHex
      || eventData.dni 
      || eventData.employee_id
      || eventData.cardNo; // Algunos dispositivos envían DNI como cardNo

    // Normalizar DNI: remover espacios, guiones, y padding de ceros a la izquierda
    const normalizeDNI = (dni: string | number | undefined): string | undefined => {
      if (!dni) return undefined;
      const dniStr = String(dni).trim().replace(/[\s-]/g, '');
      // Remover ceros a la izquierda, pero mantener al menos un dígito
      return dniStr.replace(/^0+/, '') || dniStr;
    };

    const normalizedDNI = normalizeDNI(employeeDNI);

    // Si es un heartbeat sin datos de empleado (DNI), ignorarlo para evitar log flooding
    if (eventType === 'heartBeat' && !normalizedDNI) {
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
      logger.info('--- HIKVISION EVENT RECEIVED (NON-HEARTBEAT) ---', {
        companyId: company_id,
        eventType: eventType,
        originalDNI: employeeDNI,
        normalizedDNI: normalizedDNI,
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

      // Usar createAdminClient para webhooks (no requiere autenticación de usuario)
      const supabase = createAdminClient();

      // Buscar empleado por DNI y company_id
      // Intentar búsqueda exacta primero, luego búsqueda flexible (sin padding de ceros)
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
        });
        
        // Buscar todos los empleados de la compañía y hacer match manual
        const { data: allEmployees, error: allEmployeesError } = await supabase
          .from('employees')
          .select('id, company_id, work_schedule_id, dni')
          .eq('company_id', company_id as string)
          .eq('status', 'active');

        if (!allEmployeesError && allEmployees) {
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
          }
        }
      }

      if (employeeError || !employee) {
        logger.warn(`[ATTENDANCE] Employee not found with DNI ${normalizedDNI} (original: ${employeeDNI}) for company ${company_id}`, {
          companyId: company_id,
          originalDNI: employeeDNI,
          normalizedDNI: normalizedDNI,
          eventType: eventType,
          error: employeeError,
          allEventData: eventData, // Log completo para debugging
        });
        return res.status(200).json({ 
          success: false, 
          message: `Employee with DNI ${normalizedDNI} not found.`,
          receivedDNI: employeeDNI,
          normalizedDNI: normalizedDNI,
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
          eventType: eventType,
        });
        return res.status(500).json({ success: false, error: 'Failed to save attendance record.' });
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
      logger.info(`[INFO] Ignored non-attendance event of type '${eventType}'`, {
        companyId: company_id,
        eventType: eventType,
        parsedEventData: eventData,
      });
      return res.status(200).json({ success: true, message: `Event type ${eventType} received and ignored` });
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
