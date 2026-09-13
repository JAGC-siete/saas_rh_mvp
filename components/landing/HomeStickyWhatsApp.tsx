import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import { useLandingPreferences } from './LandingPreferencesProvider'
import { getHomeCopy } from '../../lib/i18n/landings/home'

const WHATSAPP_NUMBER = '50432226773'

export default function HomeStickyWhatsApp() {
  const { locale } = useLandingPreferences()
  const copy = getHomeCopy(locale).stickyWhatsApp
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(copy.prefill)}`

  return (
    <div
      className="fixed inset-x-0 z-40 p-3 md:hidden"
      style={{ bottom: 'var(--hs-cookie-offset, 0px)' }}
    >
      <TrackedWhatsAppLink
        href={href}
        trackingContext="home_sticky_mobile"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={copy.aria}
        className="flex min-h-[48px] items-center justify-center rounded-xl bg-green-600 px-4 text-base font-semibold text-white hover:bg-green-700"
      >
        {copy.label}
      </TrackedWhatsAppLink>
    </div>
  )
}
