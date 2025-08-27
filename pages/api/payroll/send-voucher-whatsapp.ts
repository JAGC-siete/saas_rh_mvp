import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  try {
    // AUTENTICACIÓN REQUERIDA
    const authResult = await authenticateUser(req, res, ['can_export_payroll'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('Usuario autenticado para envío de voucher por WhatsApp:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { phone, employee_id, periodo, quincena } = req.body || {}
    
    // Validaciones
    if (!phone || !employee_id || !periodo || !quincena) {
      return res.status(400).json({ 
        error: 'Missing required fields: phone, employee_id, periodo, quincena' 
      })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }

    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    // Validar formato de teléfono (E.164)
    if (!/^\d{10,15}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido',
        message: 'Use formato E.164 (ej: 5049xxxxxxx)'
      })
    }

    // Validar que el usuario pertenezca a la empresa
    if (!userProfile?.company_id) {
      return res.status(403).json({ 
        error: 'No autorizado',
        message: 'Usuario no tiene empresa asignada'
      })
    }

    // Verificar que el empleado pertenezca a la empresa del usuario
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, company_id')
      .eq('id', employee_id)
      .eq('company_id', userProfile.company_id)
      .eq('status', 'active')
      .single()

    if (empError || !employee) {
      return res.status(404).json({ 
        error: 'Empleado no encontrado o no autorizado',
        message: 'El empleado no existe o no pertenece a su empresa'
      })
    }

    console.log('Empleado verificado para envío de voucher por WhatsApp:', {
      employeeId: employee.id,
      name: employee.name,
      companyId: employee.company_id
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ''
    const origin = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`) : ''

    // Generar enlace de descarga del voucher
    const downloadPath = `/api/payroll/generate-voucher`
    const downloadUrl = origin ? `${origin}${downloadPath}` : downloadPath

    // Limpiar teléfono para formato E.164
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Enlace click-to-chat para WhatsApp
    const message = encodeURIComponent(
      `Hola! Aquí tienes el enlace para descargar tu voucher de pago individual:

👤 Empleado: ${employee.name}
🆔 Código: ${employee.employee_code}
📅 Período: ${periodo} Q${quincena}

Para descargar el voucher, haz clic en el siguiente enlace seguro:
${downloadUrl}

**IMPORTANTE**: Este enlace es válido solo para usuarios autorizados de la empresa.

Si tienes alguna pregunta, contacta al departamento de RRHH.`
    )
    
    const waLink = `https://wa.me/${cleanPhone}?text=${message}`

    console.log('📱 Enlace WhatsApp generado para voucher:', {
      phone: cleanPhone,
      employee: employee.name,
      periodo,
      quincena,
      companyId: userProfile.company_id,
      waLink
    })

    return res.status(200).json({ 
      sent: false, 
      provider: 'link', 
      url: waLink,
      message: 'Enlace de WhatsApp generado para el voucher. Copia y pega en WhatsApp o haz clic para abrir.',
      phone: cleanPhone,
      voucherInfo: {
        employee: employee.name,
        employee_code: employee.employee_code,
        periodo,
        quincena
      }
    })

  } catch (e: any) {
    console.error('❌ Error en send-voucher-whatsapp:', e)
    return res.status(500).json({ 
      error: e?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}
