import type { AppLocale, AppMessages } from '../lib/i18n/app/locale'

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale
    Messages: AppMessages
  }
}
