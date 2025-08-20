import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, company, contact, employees } = req.body;
    
    // Log the demo request for testing
    console.log('Demo request received:', {
      name,
      company,
      contact,
      employees,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement actual demo creation logic
    // - Send welcome email
    // - Create demo account
    // - Send demo credentials
    
    return res.status(200).json({ 
      success: true, 
      message: 'Demo creado exitosamente',
      data: { name, company, contact, employees }
    });
  } catch (error) {
    console.error('Error creating demo:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
}
