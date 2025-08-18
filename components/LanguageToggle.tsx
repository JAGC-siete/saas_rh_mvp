import { useLanguage } from '../lib/hooks/useLanguage'

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage()

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      aria-label={`Cambiar idioma a ${language === 'es' ? 'inglés' : 'español'}`}
      title={`Cambiar idioma a ${language === 'es' ? 'inglés' : 'español'}`}
    >
      <span className="text-lg">
        {language === 'es' ? '🇺🇸' : '🇭🇳'}
      </span>
    </button>
  )
}
