import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-helpers'
import { notificationManager } from '../../../lib/notification-providers'
import { emailService } from '../../../lib/email-service'
import { whatsappService } from '../../../lib/whatsapp-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // AUTENTICACIÓN REQUERIDA - Solo administradores
    const authResult = await authenticateUser(req, res, ['admin'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const { companyId, testType, testData } = req.body || {}

    console.log('Usuario autenticado para test de notificaciones:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    // Validar que el usuario tenga permisos para la empresa especificada
    const targetCompanyId = companyId || userProfile?.company_id
    if (!targetCompanyId) {
      return res.status(400).json({ 
        error: 'Missing companyId',
        message: 'Debe especificar una empresa para el test'
      })
    }

    // Obtener configuración de notificaciones para la empresa
    const notificationConfig = await notificationManager.getConfigForCompany(targetCompanyId)
    
    if (!notificationConfig) {
      return res.status(404).json({ 
        error: 'Configuración no encontrada',
        message: `No se encontró configuración de notificaciones para la empresa ${targetCompanyId}`
      })
    }

    // Validar proveedores
    const emailValidation = await notificationManager.validateEmailProvider(notificationConfig.emailProvider)
    const whatsappValidation = await notificationManager.validateWhatsAppProvider(notificationConfig.whatsappProvider)

    const validationResults = {
      email: {
        valid: emailValidation.valid,
        error: emailValidation.error,
        provider: notificationConfig.emailProvider.type
      },
      whatsapp: {
        valid: whatsappValidation.valid,
        error: whatsappValidation.error,
        provider: notificationConfig.whatsappProvider.type
      }
    }

    // Si solo se solicita validación, retornar resultados
    if (testType === 'validate') {
      return res.status(200).json({
        success: true,
        companyId: targetCompanyId,
        validation: validationResults,
        config: {
          retryAttempts: notificationConfig.retryAttempts,
          retryDelay: notificationConfig.retryDelay
        }
      })
    }

    // Tests de envío real
    const testResults: any = {
      email: null,
      whatsapp: null
    }

    // Test de email
    if (testType === 'email' || testType === 'both') {
      const testEmail = testData?.email || 'test@example.com'
      const testSubject = `Test de Notificaciones - ${new Date().toISOString()}`
      const testBody = `Este es un email de prueba para validar la configuración de notificaciones.

Empresa: ${targetCompanyId}
Proveedor: ${notificationConfig.emailProvider.type}
Timestamp: ${new Date().toISOString()}

Si recibes este email, la configuración está funcionando correctamente.`

      try {
        const emailResult = await emailService.sendEmail(notificationConfig, {
          to: testEmail,
          subject: testSubject,
          text: testBody,
          from: notificationConfig.emailProvider.fromEmail,
          fromName: notificationConfig.emailProvider.fromName
        })

        testResults.email = {
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
          errorCode: emailResult.errorCode,
          retryCount: emailResult.retryCount,
          provider: emailResult.provider
        }
      } catch (error: any) {
        testResults.email = {
          success: false,
          error: error.message,
          errorCode: 'TEST_ERROR'
        }
      }
    }

    // Test de WhatsApp
    if (testType === 'whatsapp' || testType === 'both') {
      const testPhone = testData?.phone || '50499999999'
      const testMessage = `Test de Notificaciones WhatsApp

Empresa: ${targetCompanyId}
Proveedor: ${notificationConfig.whatsappProvider.type}
Timestamp: ${new Date().toISOString()}

Este es un mensaje de prueba para validar la configuración.`

      try {
        const whatsappResult = await whatsappService.sendWhatsApp(notificationConfig, {
          phone: testPhone,
          message: testMessage,
          type: 'text'
        })

        testResults.whatsapp = {
          success: whatsappResult.success,
          messageId: whatsappResult.messageId,
          error: whatsappResult.error,
          errorCode: whatsappResult.errorCode,
          retryCount: whatsappResult.retryCount,
          provider: whatsappResult.provider,
          waLink: whatsappResult.waLink
        }
      } catch (error: any) {
        testResults.whatsapp = {
          success: false,
          error: error.message,
          errorCode: 'TEST_ERROR'
        }
      }
    }

    return res.status(200).json({
      success: true,
      companyId: targetCompanyId,
      validation: validationResults,
      testResults,
      config: {
        retryAttempts: notificationConfig.retryAttempts,
        retryDelay: notificationConfig.retryDelay
      },
      message: `Test de ${testType} completado para la empresa ${targetCompanyId}`
    })

  } catch (e: any) {
    console.error('❌ Error en test de notificaciones:', e)
    return res.status(500).json({ 
      error: e?.message || 'Internal error',
      message: 'Error interno del servidor durante el test'
    })
  }
}
