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
      // Si no viene el campo esperado, salimos silenciosamente para no generar logs innecesarios
      return res.status(200).json({ success: true, message: 'Empty event received' });
    }

    const eventData = JSON.parse(eventDataString);

    // *** LA SOLUCIÓN AL RATE LIMIT ESTÁ AQUÍ ***
    // Si es un heartbeat, respondemos OK y no hacemos nada más para evitar la inundación de logs.
    if (eventData.eventType === 'heartBeat') {
      return res.status(200).json({ success: true, message: 'Heartbeat acknowledged' });
    }

    // Si NO es un heartbeat, ahora sí lo registramos para poder depurarlo.
    console.log('--- HIKVISION EVENT RECEIVED (NON-HEARTBEAT) ---');
    console.log('Company ID:', company_id);
    console.log('Event Type:', eventData.eventType);
    console.log('Parsed Event Data:', JSON.stringify(eventData, null, 2));
    console.log('--- END HIKVISION EVENT ---');

    // Aquí irá la lógica de inserción una vez que descifremos el evento de asistencia
    // ...

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
