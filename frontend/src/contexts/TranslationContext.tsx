import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

type Language = 'es' | 'en';
type TranslationContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage or default to 'es'
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // Set html lang attribute for accessibility
    document.documentElement.lang = lang;
  };

  // Set initial html lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, []);

  const t = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Translation missing for key: ${key} in ${language}`);
      return key;
    }
    if (!translations[key][language]) {
      console.warn(`Translation missing for language ${language} and key: ${key}`);
      return translations[key].en || translations[key].es || key;
    }
    return translations[key][language];
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};