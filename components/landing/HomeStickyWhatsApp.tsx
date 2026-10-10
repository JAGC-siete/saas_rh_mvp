import { useEffect, useState } from 'react'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import { useLandingPreferences } from './LandingPreferencesProvider'
import { getHomeCopy } from '../../lib/i18n/landings/home'

const WHATSAPP_NUMBER = '50432226773'

export default function HomeStickyWhatsApp() {
  const { locale } = useLandingPreferences()
  const copy = getHomeCopy(locale).stickyWhatsApp
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(copy.prefill)}`
  const [pastHero, setPastHero] = useState(false)

  // Hidden on the first screen so it doesn't cover the hero CTAs on phones.
  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!pastHero) return null

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
