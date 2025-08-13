import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'
import multiparty from 'multiparty'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface ActivationData {
  empleados: number
  empresa: string
  contactoNombre: string
  contactoWhatsApp: string
  contactoEmail: string
  departamentos: any
  monto: number
  comprobante?: string // URL del archivo subido
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()
    
    // Parse form data including file upload using multiparty
    const form = new multiparty.Form({
      uploadDir: './public/uploads',
      maxFilesSize: 10 * 1024 * 1024, // 10MB
    })

    // Asegurar que el directorio existe
    const uploadDir = './public/uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Promisificar el parsing
    const parseForm = (): Promise<{fields: any, files: any}> => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err)
          else resolve({ fields, files })
        })
      })
    }

    const { fields, files } = await parseForm()
    
    // Extraer datos del formulario
    const empleados = parseInt(fields.empleados?.[0] || '0')
    const empresa = fields.empresa?.[0] || ''
    const contactoNombre = fields.contactoNombre?.[0] || ''
    const contactoWhatsApp = fields.contactoWhatsApp?.[0] || ''
    const contactoEmail = fields.contactoEmail?.[0] || ''
    const departamentosStr = fields.departamentos?.[0] || '{}'
    const departamentos = JSON.parse(departamentosStr)
    
    const monto = empleados * 300

    // Procesar archivo subido
    let comprobanteUrl = ''
    if (files.comprobante && files.comprobante.length > 0) {
      const file = files.comprobante[0]
      const timestamp = Date.now()
      const fileName = `comprobante_${timestamp}_${file.originalFilename}`
      const newPath = path.join(uploadDir, fileName)
      
      // Mover archivo a ubicación final
      fs.renameSync(file.path, newPath)
      comprobanteUrl = `/uploads/${fileName}`
    }

    // Guardar en base de datos
    const activationData: ActivationData = {
      empleados,
      empresa,
      contactoNombre,
      contactoWhatsApp,
      contactoEmail,
      departamentos,
      monto,
      comprobante: comprobanteUrl
    }

    const { data, error } = await supabase
      .from('activaciones')
      .insert([{
        empleados,
        empresa,
        contacto_nombre: contactoNombre,
        contacto_whatsapp: contactoWhatsApp,
        contacto_email: contactoEmail,
        departamentos,
        monto,
        comprobante: comprobanteUrl,
        status: 'pending'
      }])
      .select()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Error saving data' })
    }

    // Enviar notificaciones (email/WhatsApp)
    await enviarNotificaciones(activationData)

    return res.status(200).json({ 
      message: 'Activación registrada exitosamente',
      data: data[0]
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
      email: data.contactoEmail,
      whatsapp: data.contactoWhatsApp,
      monto: data.monto
    })

    // Ejemplo de email (necesitarás configurar tu proveedor de email)
    /*
    await emailClient.send({
      to: data.contactoEmail,
      subject: '🎉 Tu Robot de RH será activado en 24 horas - HUMANO SISU',
      html: `
        <h1>¡Gracias ${data.contactoNombre}!</h1>
        <p>Hemos recibido tu pago por L${data.monto.toLocaleString()} para activar ${data.empleados} empleados en ${data.empresa}.</p>
        <p><strong>Próximos pasos:</strong></p>
        <ol>
          <li>Verificaremos tu comprobante de pago</li>
          <li>En máximo 24 horas tendrás tu sistema activo</li>
          <li>Te enviaremos las credenciales de acceso a este email y por WhatsApp</li>
        </ol>
        <p>¿Preguntas? Responde este email o escríbenos al WhatsApp.</p>
        <p>¡Bienvenido a HUMANO SISU! 🚀</p>
      `
    })
    */

  } catch (error) {
    console.error('Error sending notifications:', error)
    // No fallar todo el proceso si las notificaciones fallan
  }
}
