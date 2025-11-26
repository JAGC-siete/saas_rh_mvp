import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';
import getRawBody from 'raw-body';
import { logError } from '../../../lib/logger';

// Desactivamos el parser de body de Next.js para poder leer el stream de datos crudo.
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
    const rawBody = await getRawBody(req, {
      length: req.headers['content-length'],
      limit: '1mb',
      encoding: true, // Devuelve el body como string
    });

    // ¡Aquí está la clave! Registramos todo lo que recibimos.
    console.log('--- HIKVISION WEBHOOK RECEIVED ---');
    console.log('Company ID:', company_id);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Raw Body:', rawBody);
    console.log('--- END HIKVISION WEBHOOK ---');

    // Por ahora, no procesaremos los datos, solo confirmaremos la recepción.
    // TODO: Una vez que conozcamos el formato del 'rawBody', lo procesaremos aquí.
    // Probablemente será XML, por lo que necesitaremos un parser como 'xml2js'.
    /*
    const supabase = createPagesServerClient({ req, res });
    // const parsedData = ... parse rawBody ...
    const { error } = await supabase.from('attendance').insert({
        company_id: company_id,
        employee_code: parsedData.employeeId,
        timestamp: parsedData.timestamp,
        raw_payload: parsedData // Guardar el payload original puede ser útil
    });
    if (error) throw error;
    */

    return res.status(200).json({ success: true, message: 'Data received and logged' });
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
