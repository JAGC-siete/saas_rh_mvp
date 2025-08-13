import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'

interface ActivationData {
  empleados: number
  empresa: string
  contactoNombre: string
  contactoWhatsApp: string
  departamentos: string[]
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
      departamentos,
      monto
    }: ActivationData = req.body

    // Validaciones básicas
    if (!empleados || !empresa || !contactoNombre || !contactoWhatsApp) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    if (empleados < 1) {
      return res.status(400).json({ error: 'Número de empleados inválido' })
    }

    if (monto !== empleados * 300) {
      return res.status(400).json({ error: 'Monto calculado incorrectamente' })
    }

    // Guardar en base de datos
    const { data, error } = await supabase
      .from('activaciones')
      .insert([{
        empleados,
        empresa,
        contacto_nombre: contactoNombre,
        contacto_whatsapp: contactoWhatsApp,
        contacto_email: null, // No requerido en la nueva versión
        departamentos,
        monto,
        comprobante: null, // Se manejará después del pago
        status: 'pending'
      }])
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
      departamentos,
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
    // Aquí implementarías el envío de emails/WhatsApp
    // Por ejemplo usando Resend, Nodemailer, o Twilio
    
    console.log('Enviando notificaciones para:', {
      empresa: data.empresa,
      contacto: data.contactoNombre,
      whatsapp: data.contactoWhatsApp,
      empleados: data.empleados,
      monto: data.monto,
      departamentos: data.departamentos
    })

    // Ejemplo de WhatsApp (necesitarás configurar Twilio o similar)
    /*
    await whatsappClient.send({
      to: data.contactoWhatsApp,
      body: `🎉 ¡Hola ${data.contactoNombre}! Hemos recibido tu solicitud para activar ${data.empleados} empleados en ${data.empresa}.

💰 Monto total: L${data.monto.toLocaleString()}

📋 Próximos pasos:
1. Te enviaremos los datos bancarios por email
2. Una vez confirmado el pago, activaremos tu sistema
3. En máximo 24 horas tendrás acceso completo

¿Preguntas? Responde este mensaje. ¡Bienvenido a HUMANO SISU! 🚀`
    })
    */

  } catch (error) {
    console.error('Error sending notifications:', error)
    // No fallar todo el proceso si las notificaciones fallan
  }
}
