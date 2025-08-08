import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const content = {
  en: {
    hero: {
      candidate: {
        title: 'Find your next opportunity',
        subtitle: 'Connect with top companies and grow your career',
      },
      company: {
        title: 'Hire great talent',
        subtitle: 'Streamline your recruitment with modern tools',
      },
    },
  },
  es: {
    hero: {
      candidate: {
        title: 'Encuentra tu próxima oportunidad',
        subtitle: 'Conecta con empresas líderes y crece en tu carrera',
      },
      company: {
        title: 'Contrata gran talento',
        subtitle: 'Optimiza tu reclutamiento con herramientas modernas',
      },
    },
  },
}

export default function LandingPage() {
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const [userType, setUserType] = useState<'candidate' | 'company'>('candidate')
  const [darkMode, setDarkMode] = useState(false)

  const t = content[language]

  return (
    <div className={`min-h-screen bg-[var(--landing-bg)] text-[var(--landing-secondary)] ${darkMode ? 'dark' : ''}`}>
      <Head>
        <title>{`Humano SISU - ${language === 'en' ? 'Landing Page' : 'Página de Inicio'}`}</title>
        <meta
          name="description"
          content="HR platform landing page with dual user experience"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Navigation Header */}
      <header className="sticky top-0 bg-white dark:bg-gray-800 shadow-md z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-[var(--landing-primary)]">
            Humano SISU
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {language === 'en' ? 'ES' : 'EN'}
            </button>
            
            {/* User Type Switch */}
            <button
              onClick={() => setUserType(userType === 'candidate' ? 'company' : 'candidate')}
              className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {userType === 'candidate' ? 'Company View' : 'Candidate View'}
            </button>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="landing-section text-center bg-gradient-to-r from-[var(--landing-primary)] to-[var(--landing-secondary)] text-white">
          <h1 className="text-4xl font-bold mb-4">
            {t.hero[userType].title}
          </h1>
          <p className="mb-8 text-lg">
            {t.hero[userType].subtitle}
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-white text-[var(--landing-primary)] font-semibold rounded shadow hover:scale-105 transition-transform"
          >
            {language === 'en' ? 'Get Started' : 'Comenzar'}
          </Link>
        </section>

        {/* Simple Content Section */}
        <section className="landing-section">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-8">
              {language === 'en' ? 'Welcome to Humano SISU' : 'Bienvenido a Humano SISU'}
            </h2>
            <p className="text-lg mb-8">
              {language === 'en' 
                ? 'Your HR management platform for the modern workplace'
                : 'Tu plataforma de gestión de RRHH para el lugar de trabajo moderno'
              }
            </p>
            <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded shadow">
              <h3 className="text-xl font-bold mb-2 text-[var(--landing-primary)]">
                {language === 'en' ? 'Test Controls' : 'Controles de Prueba'}
              </h3>
              <p>Current Language: <strong>{language}</strong></p>
              <p>User Type: <strong>{userType}</strong></p>
              <p>Dark Mode: <strong>{darkMode ? 'On' : 'Off'}</strong></p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 Humano SISU. {language === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}</p>
        </div>
      </footer>
    </div>
  )
}