import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { logError } from '../../../lib/logger';

// Desactivamos el parser de body de Next.js para que formidable pueda procesar el stream.
export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { company_id } = req.query;

  if (!company_id || typeof company_id !== 'string') {
    return res.status(400).json({ error: 'company_id is required' });
  }

  try {
    const form = formidable({});
    const [fields] = await form.parse(req);

    const eventDataString = fields.AccessControllerEvent?.[0];
    if (!eventDataString) {
      return res.status(200).json({ success: true, message: 'Empty event received' });
    }

    const eventData = JSON.parse(eventDataString);

    if (eventData.eventType === 'heartBeat') {
      return res.status(200).json({ success: true, message: 'Heartbeat acknowledged' });
    }

    console.log('--- HIKVISION EVENT RECEIVED (NON-HEARTBEAT) ---');
    console.log('Parsed Event Data:', JSON.stringify(eventData, null, 2));
    console.log('--- END HIKVISION EVENT ---');

    // Suponemos que el evento de autenticación facial se llama 'faceAuthentication'.
    // Si vemos otro nombre en los logs, lo ajustaremos aquí.
    const isAuthEvent = eventData.eventType === 'faceAuthentication';

    if (isAuthEvent) {
      // Suponemos que el DNI del empleado viene en el campo 'employeeNoString'.
      const employeeDNI = eventData.employeeNoString;
      const timestamp = eventData.dateTime || new Date().toISOString();

      if (!employeeDNI) {
        console.warn('Auth event received without employee ID (DNI).', eventData);
        return res.status(200).json({ success: false, message: 'Event lacked employee ID.' });
      }

      const supabase = createPagesServerClient({ req, res });

      // 1. Buscar al empleado por DNI dentro de la compañía correcta.
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, user_id, company_id')
        .eq('company_id', company_id as string)
        .eq('national_id', employeeDNI) // Asumimos que la columna del DNI se llama 'national_id'
        .single();

      if (employeeError || !employee) {
        console.error(`Failed to find employee with DNI ${employeeDNI} for company ${company_id}.`, employeeError);
        return res.status(200).json({ success: false, message: `Employee with DNI ${employeeDNI} not found.` });
      }

      // 2. Si se encuentra, insertar el registro de asistencia.
      const { error: insertError } = await supabase.from('attendance').insert({
        employee_id: employee.id,
        user_id: employee.user_id,
        company_id: employee.company_id,
        timestamp: timestamp,
        source: 'device_hikvision', // Buena práctica para saber de dónde vino el registro
        raw_payload: eventData,     // Guardamos el evento original para auditorías
      });

      if (insertError) {
        // Si falla la inserción en la BD, es un error 500 real.
        throw insertError;
      }

      console.log(`Successfully recorded attendance for employee DNI ${employeeDNI}`);
    } else {
      console.warn(`Unknown eventType received: ${eventData.eventType}`);
    }

    return res.status(200).json({ success: true, message: 'Event processed' });
  } catch (error) {
    logError(error as Error, {
      additionalData: {
        company_id: company_id,
        headers: req.headers,
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
