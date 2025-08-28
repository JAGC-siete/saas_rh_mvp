import { createAdminClient } from './supabase/server'

export interface EmailProvider {
  type: 'resend' | 'sendgrid' | 'smtp'
  apiKey?: string
  host?: string
  port?: number
  user?: string
  pass?: string
  fromEmail: string
  fromName: string
  timeout?: number
}

export interface WhatsAppProvider {
  type: 'twilio' | 'meta' | 'venom-bot' | 'whatsapp-web.js'
  apiKey?: string
  accountSid?: string
  authToken?: string
  phoneNumberId?: string
  businessAccountId?: string
  sessionPath?: string
  timeout?: number
}

export interface NotificationConfig {
  companyId: string
  emailProvider: EmailProvider
  whatsappProvider: WhatsAppProvider
  retryAttempts: number
  retryDelay: number
}

export class NotificationProviderManager {
  private static instance: NotificationProviderManager
  private configCache: Map<string, NotificationConfig> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos

  static getInstance(): NotificationProviderManager {
    if (!NotificationProviderManager.instance) {
      NotificationProviderManager.instance = new NotificationProviderManager()
    }
    return NotificationProviderManager.instance
  }

  async getConfigForCompany(companyId: string): Promise<NotificationConfig | null> {
    const now = Date.now()
    const cached = this.configCache.get(companyId)
    const expiry = this.cacheExpiry.get(companyId) || 0

    // Retornar cache si no ha expirado
    if (cached && now < expiry) {
      return cached
    }

    try {
      const supabase = createAdminClient()
      
      // Buscar configuración específica de la empresa
      const { data: companyConfig, error: companyError } = await supabase
        .from('company_notification_configs')
        .select('*')
        .eq('company_id', companyId)
        .single()

      if (companyError && companyError.code !== 'PGRST116') {
        console.error('Error obteniendo configuración de empresa:', companyError)
      }

      // Si no hay configuración específica, usar configuración por defecto
      if (!companyConfig) {
        const { data: defaultConfig, error: defaultError } = await supabase
          .from('default_notification_configs')
          .select('*')
          .single()

        if (defaultError) {
          console.error('Error obteniendo configuración por defecto:', defaultError)
          return null
        }

        const config: NotificationConfig = {
          companyId,
          emailProvider: this.parseEmailProvider(defaultConfig.email_provider),
          whatsappProvider: this.parseWhatsAppProvider(defaultConfig.whatsapp_provider),
          retryAttempts: defaultConfig.retry_attempts || 1,
          retryDelay: defaultConfig.retry_delay || 1000
        }

        this.configCache.set(companyId, config)
        this.cacheExpiry.set(companyId, now + this.CACHE_TTL)
        return config
      }

      // Usar configuración específica de la empresa
      const config: NotificationConfig = {
        companyId,
        emailProvider: this.parseEmailProvider(companyConfig.email_provider),
        whatsappProvider: this.parseWhatsAppProvider(companyConfig.whatsapp_provider),
        retryAttempts: companyConfig.retry_attempts || 1,
        retryDelay: companyConfig.retry_delay || 1000
      }

      this.configCache.set(companyId, config)
      this.cacheExpiry.set(companyId, now + this.CACHE_TTL)
      return config

    } catch (error) {
      console.error('Error en NotificationProviderManager:', error)
      return null
    }
  }

  private parseEmailProvider(providerData: any): EmailProvider {
    if (!providerData) {
      // Configuración por defecto
      return {
        type: 'resend',
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM || 'noreply@cloudhr.hn',
        fromName: 'CloudHR',
        timeout: 10000
      }
    }

    return {
      type: providerData.type || 'resend',
      apiKey: providerData.api_key || process.env.RESEND_API_KEY,
      host: providerData.host,
      port: providerData.port,
      user: providerData.user,
      pass: providerData.pass,
      fromEmail: providerData.from_email || 'noreply@cloudhr.hn',
      fromName: providerData.from_name || 'CloudHR',
      timeout: providerData.timeout || 10000
    }
  }

  private parseWhatsAppProvider(providerData: any): WhatsAppProvider {
    if (!providerData) {
      // Configuración por defecto
      return {
        type: 'meta',
        apiKey: process.env.META_WHATSAPP_API_KEY,
        phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
        businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
        timeout: 10000
      }
    }

    return {
      type: providerData.type || 'meta',
      apiKey: providerData.api_key || process.env.META_WHATSAPP_API_KEY,
      accountSid: providerData.account_sid,
      authToken: providerData.auth_token,
      phoneNumberId: providerData.phone_number_id || process.env.META_WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: providerData.business_account_id || process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
      sessionPath: providerData.session_path,
      timeout: providerData.timeout || 10000
    }
  }

  async validateEmailProvider(config: EmailProvider): Promise<{ valid: boolean; error?: string }> {
    try {
      switch (config.type) {
        case 'resend':
          if (!config.apiKey) {
            return { valid: false, error: 'MAIL_CONFIG_MISSING: RESEND_API_KEY no configurado' }
          }
          // Test básico de Resend
          const { Resend } = await import('resend')
          const resend = new Resend(config.apiKey)
          // No hacer test real, solo validar configuración
          return { valid: true }

        case 'sendgrid':
          if (!config.apiKey) {
            return { valid: false, error: 'MAIL_CONFIG_MISSING: SENDGRID_API_KEY no configurado' }
          }
          return { valid: true }

        case 'smtp':
          if (!config.host || !config.port || !config.user || !config.pass) {
            return { valid: false, error: 'MAIL_CONFIG_MISSING: Configuración SMTP incompleta' }
          }
          return { valid: true }

        default:
          return { valid: false, error: 'MAIL_CONFIG_MISSING: Tipo de proveedor no soportado' }
      }
    } catch (error: any) {
      return { valid: false, error: `MAIL_CONFIG_MISSING: ${error.message}` }
    }
  }

  async validateWhatsAppProvider(config: WhatsAppProvider): Promise<{ valid: boolean; error?: string }> {
    try {
      switch (config.type) {
        case 'meta':
          if (!config.apiKey || !config.phoneNumberId) {
            return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Configuración Meta incompleta' }
          }
          return { valid: true }

        case 'twilio':
          if (!config.accountSid || !config.authToken) {
            return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Configuración Twilio incompleta' }
          }
          return { valid: true }

        case 'venom-bot':
        case 'whatsapp-web.js':
          if (!config.sessionPath) {
            return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Ruta de sesión no configurada' }
          }
          // Verificar si existe el archivo de sesión
          return { valid: true }

        default:
          return { valid: false, error: 'WHATSAPP_CONFIG_MISSING: Tipo de proveedor no soportado' }
      }
    } catch (error: any) {
      return { valid: false, error: `WHATSAPP_CONFIG_MISSING: ${error.message}` }
    }
  }

  clearCache(companyId?: string) {
    if (companyId) {
      this.configCache.delete(companyId)
      this.cacheExpiry.delete(companyId)
    } else {
      this.configCache.clear()
      this.cacheExpiry.clear()
    }
  }
}

export const notificationManager = NotificationProviderManager.getInstance()
