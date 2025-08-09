import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Menu, X, Globe, Users, Briefcase, ArrowRight, Clock } from 'lucide-react'

const content = {
  en: {
    hero: {
      candidate: {
        badge: '+1,200 people already used it to get a job',
        title: 'Turn your CV into a recruiter magnet',
        subtitle: 'From unemployed to hired in 90 days with daily feedback and $HND certification',
        ctaPrimary: 'Start for free',
        ctaSecondary: 'See how it works'
      },
      company: {
        badge: '+50 companies already found their ideal talent',
        title: 'Turn your company into a candidate magnet',
        subtitle: 'From search to hiring in record time with artificial intelligence and 24/7 support',
        ctaPrimary: 'Try for free',
        ctaSecondary: 'See how it works'
      }
    },
    services: {
      title: 'Our Services',
      candidate: {
        title: 'Personalized Advisory',
        description: '90 days of support to get a job. Activation from L1,000. You only pay if you get a job (30% of your first salary).'
      },
      company: [
        {
          title: 'Automated Recruitment',
          description: 'Our bot interviews candidates and schedules appointments for you. You only pay per hire: L5,000 - L10,000.'
        },
        {
          title: 'HR Microservices',
          description: 'Automate attendance, payroll and vouchers. Charge per employee: L500.'
        }
      ]
    },
    nav: {
      laborAdvice: 'Labor Advisory',
      recruBot: 'Recruitment Bot',
      robots: 'Robots',
      startFree: 'Start Free'
    }
  },
  es: {
    hero: {
      candidate: {
        badge: '+1,200 personas ya lo usaron para conseguir empleo',
        title: 'Convierte tu CV en un imán para reclutadores',
        subtitle: 'De desempleado a contratado en 90 días con feedback diario y certificación $HND',
        ctaPrimary: 'Empieza gratis',
        ctaSecondary: 'Ver cómo funciona'
      },
      company: {
        badge: '+50 empresas ya encontraron su talento ideal',
        title: 'Convierte tu empresa en un imán para candidatos',
        subtitle: 'De búsqueda a contratación en tiempo récord con inteligencia artificial y soporte 24/7',
        ctaPrimary: 'Prueba gratis',
        ctaSecondary: 'Ver cómo funciona'
      }
    },
    services: {
      title: 'Nuestros Servicios',
      candidate: {
        title: 'Asesoría Personalizada',
        description: '90 días de acompañamiento para conseguir empleo. Activación desde L1,000. Pagas solo si consigues trabajo (30% de tu primer salario).'
      },
      company: [
        {
          title: 'Reclutamiento Automatizado',
          description: 'Nuestro bot entrevista candidatos y agenda citas por ti. Pagas solo por contratación: L5,000 - L10,000.'
        },
        {
          title: 'Microservicios de RRHH',
          description: 'Automatiza asistencia, planilla y vouchers. Cobro por empleado: L500.'
        }
      ]
    },
    nav: {
      laborAdvice: 'Asesoría Laboral',
      recruBot: 'Bot de Reclu',
      robots: 'Robots',
      startFree: 'Comienza Gratis'
    }
  }
}

export default function LandingPage() {
  const [language, setLanguage] = useState<'en' | 'es'>('es')
  const [userType, setUserType] = useState<'candidate' | 'company'>('candidate')
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const t = content[language]

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <>
      <Head>
        <title>{`Humano SISU - ${language === 'en' ? 'HR Platform' : 'Plataforma de RRHH'}`}</title>
        <meta name="description" content="Plataforma de recursos humanos con asesoría laboral, reclutamiento automatizado y microservicios de RRHH" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-app"
      >
        {/* Header */}
        <header className="navbar">
          <div className="container">
            <div className="nav-left">
              <div className="logo">
                <span className="logo-text">HUMANO</span>
                <span className="logo-accent">SISU</span>
              </div>
              
              {/* User Type Switch */}
              <div className="user-type-switch">
                <label className="switch" aria-label="Toggle user type">
                  <input 
                    type="checkbox" 
                    checked={userType === 'company'}
                    onChange={(e) => setUserType(e.target.checked ? 'company' : 'candidate')}
                  />
                  <span className="slider"></span>
                </label>
                <span className="user-type-label">
                  {userType === 'candidate' ? 'Candidato' : 'Empresa'}
                </span>
              </div>
            </div>

            <nav>
              <div className="nav-right">
                <ul className="nav-menu">
                  <li><a href="#servicios" className="nav-link">{t.nav.laborAdvice}</a></li>
                  <li><a href="#reclutamiento" className="nav-link">{t.nav.recruBot}</a></li>
                  <li><a href="#robots" className="nav-link">{t.nav.robots}</a></li>
                  <li><Link href="/login" className="nav-link cta">{t.nav.startFree}</Link></li>
                </ul>
                
                <div className="toggle-container">
                  {/* Dark Mode Switch */}
                  <label className="switch" aria-label="Toggle dark mode">
                    <input 
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                  
                  {/* Language Toggle */}
                  <button 
                    className="toggle-btn"
                    onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                    aria-label="Switch language"
                  >
                    <span className="lang-text">{language === 'en' ? 'ES' : 'EN'}</span>
                  </button>
                </div>
              </div>
              
              {/* Mobile Hamburger */}
              <button 
                className="hamburger"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </nav>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mobile-menu">
              <ul>
                <li><a href="#servicios" onClick={() => setMobileMenuOpen(false)}>{t.nav.laborAdvice}</a></li>
                <li><a href="#reclutamiento" onClick={() => setMobileMenuOpen(false)}>{t.nav.recruBot}</a></li>
                <li><a href="#robots" onClick={() => setMobileMenuOpen(false)}>{t.nav.robots}</a></li>
                <li><Link href="/login" onClick={() => setMobileMenuOpen(false)}>{t.nav.startFree}</Link></li>
              </ul>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <p className="badge">{t.hero[userType].badge}</p>
            <h1>{t.hero[userType].title}</h1>
            <p className="subtitle">{t.hero[userType].subtitle}</p>
            <div className="cta-buttons">
              <Link href="/login" className="btn-primary">{t.hero[userType].ctaPrimary}</Link>
              <a href="#demo" className="btn-secondary">{t.hero[userType].ctaSecondary}</a>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="servicios" id="servicios">
          <div className="container">
            <h2>{t.services.title}</h2>
            <div className="grid vertical-layout">
              {userType === 'candidate' ? (
                <div className="card" data-user-type="candidate">
                  <div className="card-icon">
                    <Users size={32} />
                  </div>
                  <h3>{t.services.candidate.title}</h3>
                  <p>{t.services.candidate.description}</p>
                </div>
              ) : (
                t.services.company.map((service, index) => (
                  <div key={index} className="card" data-user-type="company">
                    <div className="card-icon">
                      {index === 0 ? <Briefcase size={32} /> : <Globe size={32} />}
                    </div>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Contact/WhatsApp Section */}
        <section className="contact-section" id="contacto">
          <div className="container">
            <h2>{language === 'en' ? 'Ready to get started?' : '¿Listo para comenzar?'}</h2>
            <p>{language === 'en' ? 'Contact us via WhatsApp for personalized assistance' : 'Contáctanos por WhatsApp para asistencia personalizada'}</p>
            <div className="contact-buttons">
              <a 
                href="https://wa.me/50488888888" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-whatsapp"
              >
                <span>💬</span>
                {language === 'en' ? 'Chat on WhatsApp' : 'Chatear por WhatsApp'}
              </a>
              <Link href="/login" className="btn-system">
                {language === 'en' ? 'Access System' : 'Acceder al Sistema'}
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <div className="container">
            <p>&copy; 2025 Humano SISU. {language === 'en' ? 'All rights reserved' : 'Todos los derechos reservados'}.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
