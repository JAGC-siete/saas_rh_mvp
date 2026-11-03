import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { LOCALES } from '../../lib/i18n/locale'
import { APP_ENGLISH_FEATURE, type AppLocale } from '../../lib/i18n/app/locale'
import { useAppLocale } from '../AppLocaleProvider'
import { useNavPermissions } from '../layout/useNavPermissions'
import { Card } from '../ui/card'

export default function LanguageSettings() {
  const t = useTranslations('settings.language')
  const toast = useToast()
  const { user, userProfile } = useAuth()
  const { features } = useNavPermissions(user?.id, userProfile)
  const { locale, setLocale } = useAppLocale()
  const [saving, setSaving] = useState(false)

  // Kept visible while in English so a user can always get back if the feature is switched off.
  if (!features?.[APP_ENGLISH_FEATURE] && locale !== 'en') return null

  const onChange = async (next: AppLocale) => {
    setSaving(true)
    try {
      await setLocale(next)
      toast.success(t('title'), t('saved'))
    } catch {
      toast.error(t('title'), t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card variant="liquid" className="p-5 border border-white/15">
      <h2 className="text-md font-medium text-white mb-1">{t('title')}</h2>
      <p className="text-xs text-gray-400 mb-3">{t('description')}</p>
      <div className="min-w-[200px] max-w-xs">
        <label htmlFor="app-locale" className="block text-xs text-gray-400 mb-1">
          {t('label')}
        </label>
        <select
          id="app-locale"
          value={locale}
          disabled={saving}
          onChange={(e) => void onChange(e.target.value as AppLocale)}
          className="w-full rounded-md bg-white/5 border border-white/20 text-white text-sm px-3 py-2"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l} className="bg-gray-900">
              {t(`options.${l}`)}
            </option>
          ))}
        </select>
      </div>
    </Card>
  )
}
