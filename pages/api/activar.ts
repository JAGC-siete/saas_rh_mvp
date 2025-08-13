import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'

interface ActivationData {
  empleados: number
  empresa: string
  contactoNombre: string
  contactoWhatsApp: string
  contactoEmail: string
  departamentosCount?: number
  monto: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()
    
    // Extraer datos del body JSON
    const {
      empleados,
      empresa,
      contactoNombre,
      contactoWhatsApp,
      contactoEmail,
      departamentosCount,
      monto
    }: ActivationData = req.body

    // Validaciones básicas
    if (!empleados || !empresa || !contactoNombre || !contactoWhatsApp || !contactoEmail) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    if (empleados < 1) {
      return res.status(400).json({ error: 'Número de empleados inválido' })
    }

    if (monto !== empleados * 300) {
      return res.status(400).json({ error: 'Monto calculado incorrectamente' })
    }

    // Estructurar payload compatible con la tabla actual
    const payload: any = {
      empleados,
      empresa,
      contacto_nombre: contactoNombre,
      contacto_whatsapp: contactoWhatsApp,
      contacto_email: contactoEmail,
      // Guardamos un resumen de departamentos como número total dentro de JSON
      departamentos: departamentosCount != null ? { total: departamentosCount } : [],
      monto,
      comprobante: null,
      status: 'pending'
    }

    // Guardar en base de datos
    const { data, error } = await supabase
      .from('activaciones')
      .insert([payload])
      .select()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Error saving data' })
    }

    // Enviar notificaciones (email/WhatsApp)
    await enviarNotificaciones({
      empleados,
      empresa,
      contactoNombre,
      contactoWhatsApp,
      contactoEmail,
      departamentosCount,
      monto
    })

    return res.status(200).json({ 
      message: 'Activación registrada exitosamente',
      data: data[0],
      nextSteps: [
        'Te contactaremos por WhatsApp en las próximas 2 horas',
        'Te enviaremos los datos bancarios para el pago',
        'Una vez confirmado el pago, activaremos tu sistema en 24 horas'
      ]
    })

  } catch (error) {
    console.error('Error processing activation:', error)
    return res.status(500).json({ error: 'Error processing request' })
  }
}

async function enviarNotificaciones(data: ActivationData) {
  try {
    console.log('Enviando notificaciones para:', {
      empresa: data.empresa,
      contacto: data.contactoNombre,
      whatsapp: data.contactoWhatsApp,
      email: data.contactoEmail,
      empleados: data.empleados,
      monto: data.monto,
      departamentos: data.departamentosCount
    })
  } catch (error) {
    console.error('Error sending notifications:', error)
  }
}
