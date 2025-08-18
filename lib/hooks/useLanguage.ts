import { useState, useEffect } from 'react'
import { Language, getTranslation, formatTranslation } from '../translations'

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('es')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang)
    }
    setIsLoaded(true)
  }, [])

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const t = (key: string): string => {
    return getTranslation(language, key)
  }

  const tf = (key: string, params: Record<string, string> = {}): string => {
    return formatTranslation(language, key, params)
  }

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es'
    changeLanguage(newLang)
  }

  return {
    language,
    changeLanguage,
    toggleLanguage,
    t,
    tf,
    isLoaded
  }
}
