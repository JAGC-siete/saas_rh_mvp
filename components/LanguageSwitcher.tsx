import { useRouter } from 'next/router'

export default function LanguageSwitcher() {
  const router = useRouter()
  const { locale, asPath } = router
  const toggleLocale = locale === 'es' ? 'en' : 'es'

  const switchLanguage = () => {
    document.cookie = `LOCALE=${toggleLocale}; path=/; max-age=31536000`
    router.push(asPath, asPath, { locale: toggleLocale })
  }

  return (
    <button onClick={switchLanguage} className="text-sm text-brand-200 hover:text-white px-3 py-2">
      {toggleLocale.toUpperCase()}
    </button>
  )
}
