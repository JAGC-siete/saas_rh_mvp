import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { notificationManager } from '../../../lib/notification-providers'
import { emailService } from '../../../lib/email-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
    
    // Ensure userProfile exists
    if (!userProfile || !userProfile.company_id) {
      return res.status(400).json({ 
        error: 'Invalid user profile',
        message: 'User profile or company ID not found'
      })
    }
    
    const supabase = createClient(req, res)

    console.log('Usuario autenticado para test de notificaciones:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { testType = 'both', testData } = req.body || {}
    
    // Validaciones
    if (!['email', 'whatsapp', 'both'].includes(testType)) {
      return res.status(400).json({ error: 'testType debe ser: email, whatsapp, o both' })
    }

    // Obtener configuración de notificaciones
    const notificationConfig = await notificationManager.getConfigForCompany(userProfile.company_id)
    
    if (!notificationConfig) {
      return res.status(400).json({ 
        error: 'Configuración de notificaciones no encontrada',
        message: 'Configure las notificaciones para su empresa'
      })
    }

    const testResults: any = {
      company_id: userProfile.company_id,
      test_type: testType,
      timestamp: new Date().toISOString(),
      results: {}
    }

    // Test de Email
    if (testType === 'email' || testType === 'both') {
      const testEmail = testData?.email || 'test@example.com'
      const testSubject = 'Test de Notificaciones Email'
      const testMessage = `Test de Notificaciones Email
      
Este es un mensaje de prueba para verificar que el sistema de notificaciones por email esté funcionando correctamente.

Fecha: ${new Date().toLocaleDateString('es-HN')}
Hora: ${new Date().toLocaleTimeString('es-HN')}
Usuario: ${user.email}
Empresa: ${userProfile.company_id}

Si recibe este mensaje, el sistema de email está funcionando correctamente.`

      try {
        const emailResult = await emailService.sendEmail(notificationConfig, {
          to: testEmail,
          subject: testSubject,
          text: testMessage
        })

        testResults.results.email = {
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
          errorCode: emailResult.errorCode,
          provider: emailResult.provider,
          retryCount: emailResult.retryCount
        }

        if (emailResult.success) {
          console.log('✅ Test de email exitoso:', emailResult.messageId)
        } else {
          console.error('❌ Test de email falló:', emailResult.error)
        }

      } catch (error: any) {
        console.error('❌ Error crítico en test de email:', error)
        testResults.results.email = {
          success: false,
          error: error.message || 'Error interno del servicio de email',
          errorCode: 'EMAIL_TEST_ERROR'
        }
      }
    }

    // Test de WhatsApp
    if (testType === 'whatsapp' || testType === 'both') {
      // FEATURE EN DESARROLLO - WhatsApp no implementado aún
      testResults.results.whatsapp = {
        success: false,
        error: 'Feature en desarrollo - We will implement that later. Forget it for now.',
        errorCode: 'WHATSAPP_IN_DEVELOPMENT',
        provider: 'development',
        note: 'WhatsApp testing is not yet implemented'
      }
      
      console.log('⚠️ Test de WhatsApp deshabilitado - Feature en desarrollo')
    }

    console.log('Test de notificaciones completado:', {
      companyId: userProfile.company_id,
      testType,
      results: testResults.results
    })

    return res.status(200).json({
      message: 'Test de notificaciones completado',
      ...testResults
    })

  } catch (error) {
    console.error('Error en test de notificaciones:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
