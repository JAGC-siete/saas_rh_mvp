import React from 'react'
import Link from 'next/link'
import TrackedWhatsAppLink from './TrackedWhatsAppLink'
import { FOOTER_GUIDE_KEYS, GUIDE_LINKS } from '../lib/seo/internal-links'
import { SOCIAL_LINKS } from '../lib/marketing/social-links'

interface DemoFooterProps {
  variant?: 'default' | 'minimal'
}

const DemoFooter: React.FC<DemoFooterProps> = ({ variant = 'default' }) => {
  const isMinimal = variant === 'minimal'

  return (
    <footer className={`bg-slate-50 border-t border-slate-200 mt-auto ${isMinimal ? 'py-20' : ''}`}>
      <div className={`max-w-6xl mx-auto px-4 ${isMinimal ? 'py-4' : 'py-8'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <h3 className={`font-semibold text-brand-900 mb-4 ${isMinimal ? 'text-xs uppercase tracking-widest' : 'text-lg'}`}>
              Contacto
            </h3>
            <div className="space-y-2">
              <div className={`flex items-center text-gray-600 ${isMinimal ? 'text-sm' : ''}`}>
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:humanosisu@humanosisu.net" className="hover:text-blue-600">
                  humanosisu@humanosisu.net
                </a>
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <TrackedWhatsAppLink
                  href="https://wa.me/50432226773"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-green-600"
                  trackingContext="footer_contact"
                >
                  WhatsApp: 504 32226773
                </TrackedWhatsAppLink>
              </div>
            </div>
          </div>

          {/* Join Community */}
          <div>
            <h3 className={`font-semibold text-brand-900 mb-4 ${isMinimal ? 'text-xs uppercase tracking-widest' : 'text-lg'}`}>
              Únete a la Comunidad
            </h3>
            <p className={`text-gray-600 mb-4 ${isMinimal ? 'text-xs' : 'text-sm'}`}>
              Síguenos en nuestras redes sociales para conocer las últimas actualizaciones
            </p>
            <div className="flex space-x-4">
              {/* Facebook */}
              <a 
                href={SOCIAL_LINKS.facebook} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* Instagram — @humanosisu666 */}
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-600 transition-colors"
                title="Instagram @humanosisu666"
                aria-label="Instagram @humanosisu666"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a 
                href={SOCIAL_LINKS.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-700 transition-colors"
                title="LinkedIn"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a 
                href={SOCIAL_LINKS.youtube} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="YouTube"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-900 transition-colors"
                title="TikTok"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>

              {/* X */}
              <a
                href={SOCIAL_LINKS.x}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-900 transition-colors"
                title="X"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Guides & Resources */}
          <div>
            <h3 className={`font-semibold text-brand-900 mb-4 ${isMinimal ? 'text-xs uppercase tracking-widest' : 'text-lg'}`}>
              Guías y recursos
            </h3>
            <ul className="space-y-2">
              {FOOTER_GUIDE_KEYS.map((key) => (
                <li key={GUIDE_LINKS[key].href}>
                  <Link
                    href={GUIDE_LINKS[key].href}
                    className={`text-gray-600 hover:text-blue-600 transition-colors ${isMinimal ? 'text-xs uppercase tracking-wider' : 'text-sm'}`}
                  >
                    {GUIDE_LINKS[key].label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className={`font-semibold text-brand-900 mb-4 ${isMinimal ? 'text-xs uppercase tracking-widest' : 'text-lg'}`}>
              SISU
            </h3>
            <p className={`text-gray-600 mb-4 ${isMinimal ? 'text-xs' : 'text-sm'}`}>
              El método más eficiente para digitalizar y automatizar RRHH para MiPyMes en Centroamérica
            </p>
            <div className="text-sm text-gray-500">
              <p>© 2026 SISU RRHH exclusivo El Salvador | Guatemala | Honduras.</p>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className={`border-t border-slate-200 mt-8 ${isMinimal ? 'pt-12' : 'pt-8'}`}>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Protegemos tu información. <strong>Solo será utilizada para contactarte</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center text-xs text-gray-500">
              <a 
                href="/politica-de-privacidad" 
                className="text-gray-600 hover:text-gray-900 transition-colors underline decoration-gray-400/30 hover:decoration-gray-600"
              >
                Política de Privacidad
              </a>
              <span className="hidden sm:inline">•</span>
              <a
                href="/terminos-de-servicio"
                className="text-gray-600 hover:text-gray-900 transition-colors underline decoration-gray-400/30 hover:decoration-gray-600"
              >
                Términos de servicio
              </a>
              <span className="hidden sm:inline">•</span>
              <span>© 2026 Humano SISU. Todos los derechos reservados.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default DemoFooter
