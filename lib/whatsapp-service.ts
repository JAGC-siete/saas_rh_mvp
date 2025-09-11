import { WhatsAppProvider, NotificationConfig } from './notification-providers'

export interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: string
  retryCount?: number
  provider?: string
  waLink?: string
}

export interface WhatsAppContent {
  phone: string
  message: string
  type?: 'text' | 'document' | 'link'
  documentUrl?: string
}

export class WhatsAppService {
  private static instance: WhatsAppService

  static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService()
    }
    return WhatsAppService.instance
  }

  async sendWhatsApp(
    config: NotificationConfig,
    content: WhatsAppContent,
    retryCount = 0
  ): Promise<WhatsAppResult> {
    const maxRetries = config.retryAttempts
    const retryDelay = config.retryDelay

    try {
      console.log(`📱 Enviando WhatsApp (intento ${retryCount + 1}/${maxRetries + 1}):`, {
        phone: content.phone,
        provider: config.whatsappProvider.type,
        companyId: config.companyId
      })

      // Validar proveedor antes de enviar
      const validation = await this.validateProvider(config.whatsappProvider)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Proveedor no válido',
          errorCode: 'PROVIDER_VALIDATION_FAILED',
          retryCount,
          provider: config.whatsappProvider.type
        }
      }

      const result = await this.sendWithProvider(config.whatsappProvider, content)

      if (result.success) {
        console.log('✅ WhatsApp enviado exitosamente:', {
          messageId: result.messageId,
          provider: config.whatsappProvider.type,
          companyId: config.companyId
        })
        return {
          ...result,
          retryCount,
          provider: config.whatsappProvider.type
        }
      }

      // Si falló y hay reintentos disponibles, reintentar
      if (retryCount < maxRetries) {
        console.log(`🔄 Reintentando envío de WhatsApp (${retryDelay}ms)...`)
        await this.delay(retryDelay)
        return this.sendWhatsApp(config, content, retryCount + 1)
      }

      // Sin más reintentos disponibles
      console.error('❌ WhatsApp falló después de todos los reintentos:', {
        error: result.error,
        errorCode: result.errorCode,
        provider: config.whatsappProvider.type,
        companyId: config.companyId
      })

      return {
        ...result,
        retryCount,
        provider: config.whatsappProvider.type
      }

    } catch (error: any) {
      console.error('❌ Error crítico en WhatsAppService:', error)

      // Si hay reintentos disponibles, reintentar
      if (retryCount < maxRetries) {
        console.log(`🔄 Reintentando envío de WhatsApp después de error (${retryDelay}ms)...`)
        await this.delay(retryDelay)
        return this.sendWhatsApp(config, content, retryCount + 1)
      }

      return {
        success: false,
        error: error.message || 'Error interno del servicio de WhatsApp',
        errorCode: 'WHATSAPP_SERVICE_ERROR',
        retryCount,
        provider: config.whatsappProvider.type
      }
    }
  }

  private async validateProvider(provider: WhatsAppProvider): Promise<{ valid: boolean; error?: string }> {
    try {
      switch (provider.type) {
        case 'meta':
          if (!provider.apiKey || !provider.phoneNumberId) {
            return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Configuración Meta incompleta' }
          }
          // Validar token de Meta
          return await this.validateMetaToken(provider.apiKey)

        case 'twilio':
          if (!provider.accountSid || !provider.authToken) {
            return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Configuración Twilio incompleta' }
          }
          // Validar credenciales de Twilio
          return await this.validateTwilioCredentials(provider.accountSid, provider.authToken)

        case 'venom-bot':
        case 'whatsapp-web.js':
          if (!provider.sessionPath) {
            return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Ruta de sesión no configurada' }
          }
          // Validar sesión local
          return await this.validateLocalSession(provider.sessionPath, provider.type)

        default:
          return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Tipo de proveedor no soportado' }
      }
    } catch (error: any) {
      return { valid: false, error: `WHATSAPP_CONFIG_MISSING: ${error.message}` }
    }
  }

  private async validateMetaToken(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validar token de Meta haciendo una petición de prueba
      const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${apiKey}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: 'Token de Meta expirado o inválido' }
        }
        if (response.status === 403) {
          return { valid: false, error: 'Token de Meta no tiene permisos suficientes' }
        }
        return { valid: false, error: `Error validando token de Meta: ${response.status}` }
      }

      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: `Error validando token de Meta: ${error.message}` }
    }
  }

  private async validateTwilioCredentials(accountSid: string, authToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validar credenciales de Twilio haciendo una petición de prueba
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
        }
      })

      if (response.status === 401) {
        return { valid: false, error: 'Credenciales de Twilio inválidas' }
      }
      if (response.status === 403) {
        return { valid: false, error: 'Credenciales de Twilio no tienen permisos suficientes' }
      }

      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: `Error validando credenciales de Twilio: ${error.message}` }
    }
  }

  private async validateLocalSession(sessionPath: string, type: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const fs = await import('fs')
      const path = await import('path')

      // Verificar si existe el archivo de sesión
      if (!fs.existsSync(sessionPath)) {
        return { valid: false, error: `Archivo de sesión no encontrado: ${sessionPath}` }
      }

      // Verificar si la sesión no está corrupta
      const stats = fs.statSync(sessionPath)
      if (stats.size === 0) {
        return { valid: false, error: 'Archivo de sesión está vacío o corrupto' }
      }

      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: `Error validando sesión local: ${error.message}` }
    }
  }

  private async sendWithProvider(provider: WhatsAppProvider, content: WhatsAppContent): Promise<WhatsAppResult> {
    try {
      switch (provider.type) {
        case 'meta':
          return await this.sendWithMeta(provider, content)
        case 'twilio':
          return await this.sendWithTwilio(provider, content)
        case 'venom-bot':
          return await this.sendWithVenomBot(provider, content)
        case 'whatsapp-web.js':
          return await this.sendWithWhatsAppWeb(provider, content)
        default:
          return {
            success: false,
            error: `Proveedor de WhatsApp no soportado: ${provider.type}`,
            errorCode: 'UNSUPPORTED_PROVIDER'
          }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error enviando WhatsApp',
        errorCode: 'PROVIDER_ERROR'
      }
    }
  }

  private async sendWithMeta(provider: WhatsAppProvider, content: WhatsAppContent): Promise<WhatsAppResult> {
    try {
      if (!provider.apiKey || !provider.phoneNumberId) {
        return {
          success: false,
          error: 'Configuración Meta incompleta',
          errorCode: 'MAIL_CONFIG_MISSING'
        }
      }

      const cleanPhone = content.phone.replace(/\D/g, '')
      const phoneNumberId = provider.phoneNumberId

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: content.message }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.error?.message || `Error de Meta: ${response.status}`,
          errorCode: 'META_ERROR'
        }
      }

      const result = await response.json()
      return {
        success: true,
        messageId: result.messages?.[0]?.id
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error de Meta',
        errorCode: 'META_ERROR'
      }
    }
  }

  private async sendWithTwilio(provider: WhatsAppProvider, content: WhatsAppContent): Promise<WhatsAppResult> {
    try {
      if (!provider.accountSid || !provider.authToken) {
        return {
          success: false,
          error: 'Configuración Twilio incompleta',
          errorCode: 'MAIL_CONFIG_MISSING'
        }
      }

      const cleanPhone = content.phone.replace(/\D/g, '')
      const fromNumber = `whatsapp:+${cleanPhone}`

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${provider.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${provider.accountSid}:${provider.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: `whatsapp:+${cleanPhone}`,
          Body: content.message
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.message || `Error de Twilio: ${response.status}`,
          errorCode: 'TWILIO_ERROR'
        }
      }

      const result = await response.json()
      return {
        success: true,
        messageId: result.sid
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error de Twilio',
        errorCode: 'TWILIO_ERROR'
      }
    }
  }

  private async sendWithVenomBot(provider: WhatsAppProvider, content: WhatsAppContent): Promise<WhatsAppResult> {
    try {
      // Para venom-bot, generar enlace de WhatsApp como fallback
      const cleanPhone = content.phone.replace(/\D/g, '')
      const message = encodeURIComponent(content.message)
      const waLink = `https://wa.me/${cleanPhone}?text=${message}`

      return {
        success: false,
        error: 'Venom-bot requiere implementación adicional',
        errorCode: 'VENOM_BOT_NOT_IMPLEMENTED',
        waLink
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error de Venom-bot',
        errorCode: 'VENOM_BOT_ERROR'
      }
    }
  }

  private async sendWithWhatsAppWeb(provider: WhatsAppProvider, content: WhatsAppContent): Promise<WhatsAppResult> {
    try {
      // Para whatsapp-web.js, generar enlace de WhatsApp como fallback
      const cleanPhone = content.phone.replace(/\D/g, '')
      const message = encodeURIComponent(content.message)
      const waLink = `https://wa.me/${cleanPhone}?text=${message}`

      return {
        success: false,
        error: 'WhatsApp Web requiere implementación adicional',
        errorCode: 'WHATSAPP_WEB_NOT_IMPLEMENTED',
        waLink
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error de WhatsApp Web',
        errorCode: 'WHATSAPP_WEB_ERROR'
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const whatsappService = WhatsAppService.getInstance()
