import { EmailProvider, NotificationConfig } from './notification-providers'

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: string
  retryCount?: number
  provider?: string
}

export interface EmailContent {
  to: string
  subject: string
  text: string
  html?: string
  from?: string
  fromName?: string
}

export class EmailService {
  private static instance: EmailService

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail(
    config: NotificationConfig,
    content: EmailContent,
    retryCount = 0
  ): Promise<EmailResult> {
    const maxRetries = config.retryAttempts
    const retryDelay = config.retryDelay

    try {
      console.log(`📧 Enviando email (intento ${retryCount + 1}/${maxRetries + 1}):`, {
        to: content.to,
        provider: config.emailProvider.type,
        companyId: config.companyId
      })

      const result = await this.sendWithProvider(config.emailProvider, content)

      if (result.success) {
        console.log('✅ Email enviado exitosamente:', {
          messageId: result.messageId,
          provider: config.emailProvider.type,
          companyId: config.companyId
        })
        return {
          ...result,
          retryCount,
          provider: config.emailProvider.type
        }
      }

      // Si falló y hay reintentos disponibles, reintentar
      if (retryCount < maxRetries) {
        console.log(`🔄 Reintentando envío de email (${retryDelay}ms)...`)
        await this.delay(retryDelay)
        return this.sendEmail(config, content, retryCount + 1)
      }

      // Sin más reintentos disponibles
      console.error('❌ Email falló después de todos los reintentos:', {
        error: result.error,
        errorCode: result.errorCode,
        provider: config.emailProvider.type,
        companyId: config.companyId
      })

      return {
        ...result,
        retryCount,
        provider: config.emailProvider.type
      }

    } catch (error: any) {
      console.error('❌ Error crítico en EmailService:', error)

      // Si hay reintentos disponibles, reintentar
      if (retryCount < maxRetries) {
        console.log(`🔄 Reintentando envío de email después de error (${retryDelay}ms)...`)
        await this.delay(retryDelay)
        return this.sendEmail(config, content, retryCount + 1)
      }

      return {
        success: false,
        error: error.message || 'Error interno del servicio de email',
        errorCode: 'EMAIL_SERVICE_ERROR',
        retryCount,
        provider: config.emailProvider.type
      }
    }
  }

  private async sendWithProvider(provider: EmailProvider, content: EmailContent): Promise<EmailResult> {
    try {
      // Solo soportamos Resend por ahora
      if (provider.type !== 'resend') {
        return {
          success: false,
          error: `Proveedor de email no soportado: ${provider.type}. Solo se soporta Resend.`,
          errorCode: 'UNSUPPORTED_PROVIDER'
        }
      }
      
      return await this.sendWithResend(provider, content)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error enviando email',
        errorCode: 'PROVIDER_ERROR'
      }
    }
  }

  private async sendWithResend(provider: EmailProvider, content: EmailContent): Promise<EmailResult> {
    try {
      if (!provider.apiKey) {
        return {
          success: false,
          error: 'RESEND_API_KEY no configurado',
          errorCode: 'MAIL_CONFIG_MISSING'
        }
      }

      const { Resend } = await import('resend')
      const resend = new Resend(provider.apiKey)

      const result = await resend.emails.send({
        from: content.from || provider.fromEmail,
        to: content.to,
        subject: content.subject,
        text: content.text,
        html: content.html
      })

      if ((result as any)?.error) {
        return {
          success: false,
          error: (result as any).error?.message || 'Error de Resend',
          errorCode: 'RESEND_ERROR'
        }
      }

      return {
        success: true,
        messageId: (result as any)?.id
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error de Resend',
        errorCode: 'RESEND_ERROR'
      }
    }
  }



  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const emailService = EmailService.getInstance()
