import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { logError, logger } from '../../../lib/logger';
import { getTodayInHonduras, nowInHonduras } from '../../../lib/timezone';

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

    const eventData = JSON.parse(eventDataString);
    const eventType = eventData.eventType;

    // Intentar extraer el DNI del empleado de diferentes campos posibles
    const employeeDNI = eventData.employeeNoString || eventData.employeeNo || eventData.dni || eventData.employee_id;

    // Si es un heartbeat sin datos de empleado (DNI), ignorarlo para evitar log flooding
    if (eventType === 'heartBeat' && !employeeDNI) {
      return res.status(200).json({ success: true, message: 'Heartbeat acknowledged' });
    }

    // Si es un heartbeat CON datos de empleado, procesarlo como asistencia
    if (eventType === 'heartBeat' && employeeDNI) {
      logger.info('--- HIKVISION HEARTBEAT WITH EMPLOYEE DATA ---', {
        companyId: company_id,
        parsedEventData: eventData,
      });
    } else if (eventType !== 'heartBeat') {
      // Si no es un heartbeat, lo registramos para depuración.
      logger.info('--- HIKVISION EVENT RECEIVED (NON-HEARTBEAT) ---', {
        companyId: company_id,
        parsedEventData: eventData,
      });
    }

    // Procesar cualquier evento que tenga DNI (incluyendo heartbeats con datos de empleado)
    // o eventos de autenticación válidos
    if (employeeDNI || VALID_AUTHENTICATION_EVENTS.includes(eventType)) {
      // Si no hay DNI pero es un evento de autenticación válido, no procesar
      if (!employeeDNI) {
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
        eventTimestamp = new Date(eventData.timestamp);
      } else {
        eventTimestamp = nowInHonduras();
      }

      const supabase = createPagesServerClient({ req, res });

      // Buscar empleado por DNI y company_id
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, company_id, work_schedule_id')
        .eq('company_id', company_id as string)
        .eq('dni', employeeDNI)
        .eq('status', 'active')
        .single();

      if (employeeError || !employee) {
        logger.warn(`[ATTENDANCE] Employee not found with DNI ${employeeDNI} for company ${company_id}`, {
          companyId: company_id,
          employeeDNI: employeeDNI,
          eventType: eventType,
          error: employeeError,
        });
        return res.status(200).json({ success: false, message: `Employee with DNI ${employeeDNI} not found.` });
      }

      // Obtener la fecha en formato YYYY-MM-DD para Honduras
      const todayDate = getTodayInHonduras();
      
      // Convertir el timestamp del evento a ISO string (UTC)
      const checkInTimestamp = eventTimestamp.toISOString();

      // Insertar o actualizar el registro de asistencia
      // Si ya existe un registro para hoy, actualizamos el check_in
      const { data: record, error: upsertError } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employee.id,
          date: todayDate,
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

      logger.info(`[SUCCESS] Recorded attendance for employee DNI ${employeeDNI} via event '${eventType}'`, {
        companyId: company_id,
        employeeId: employee.id,
        employeeDNI: employeeDNI,
        eventType: eventType,
        recordId: record?.id,
        checkIn: checkInTimestamp,
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
