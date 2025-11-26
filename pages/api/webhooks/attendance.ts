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

    // Los datos JSON vienen como un string en el campo 'AccessControllerEvent'
    const eventDataString = fields.AccessControllerEvent?.[0];
    if (!eventDataString) {
      throw new Error('AccessControllerEvent field not found in multipart data');
    }

    const eventData = JSON.parse(eventDataString);

    console.log('--- HIKVISION EVENT PARSED ---');
    console.log('Company ID:', company_id);
    console.log('Event Type:', eventData.eventType);
    console.log('Parsed Event Data:', JSON.stringify(eventData, null, 2));
    console.log('--- END HIKVISION EVENT ---');

    // Ahora podemos manejar diferentes tipos de eventos
    switch (eventData.eventType) {
      case 'heartBeat':
        // Es solo una señal de vida, no hacemos nada más que confirmar.
        console.log(`Heartbeat received from company ${company_id}`);
        break;
      
      case 'faceAuthentication': // Asumo el nombre del evento, podría ser otro
      case 'authenticationSuccess': // O algo similar
        // ¡ESTE ES EL EVENTO QUE NOS INTERESA!
        console.log(`Attendance event received for company ${company_id}`);
        
        // TODO: Mapear los campos de 'eventData' a la tabla 'attendance'
        // const employeeCode = eventData.employeeNoString; // Ejemplo
        // const timestamp = eventData.dateTime; // Ejemplo

        /*
        const supabase = createPagesServerClient({ req, res });
        const { error } = await supabase.from('attendance').insert({
            company_id: company_id,
            employee_code: employeeCode,
            timestamp: timestamp,
            raw_payload: eventData
        });
        if (error) throw error;
        */
        break;

      default:
        console.warn(`Unknown eventType received: ${eventData.eventType}`);
    }

    return res.status(200).json({ success: true, message: 'Event received and processed' });
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
