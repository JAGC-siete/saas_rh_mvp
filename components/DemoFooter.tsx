import React from 'react'

const DemoFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contacto</h3>
            <div className="space-y-2">
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:jorge7gomez@gmail.com" className="hover:text-blue-600">
                  jorge7gomez@gmail.com
                </a>
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="https://wa.me/50494707007" target="_blank" rel="noopener noreferrer" className="hover:text-green-600">
                  WhatsApp: 9470-7007
                </a>
              </div>
            </div>
          </div>

          {/* Join Community */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Únete a la Comunidad</h3>
            <p className="text-gray-600 text-sm mb-4">
              Síguenos en nuestras redes sociales para conocer las últimas actualizaciones
            </p>
            <div className="flex space-x-4">
              {/* Facebook */}
              <a 
                href="https://facebook.com/humanosisu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a 
                href="https://instagram.com/humanosisu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-600 transition-colors"
                title="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323C6.001 8.198 7.152 7.708 8.449 7.708s2.448.49 3.323 1.297c.926.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.323C10.897 16.498 9.746 16.988 8.449 16.988z"/>
                  <path d="M12 7.378c-2.552 0-4.622 2.069-4.622 4.622S9.448 16.622 12 16.622s4.622-2.069 4.622-4.622S14.552 7.378 12 7.378zM12 15.004c-1.657 0-3.004-1.347-3.004-3.004S10.343 8.996 12 8.996s3.004 1.347 3.004 3.004S13.657 15.004 12 15.004z"/>
                  <circle cx="16.806" cy="7.207" r="1.078"/>
                </svg>
              </a>

              {/* LinkedIn */}
              <a 
                href="https://linkedin.com/company/humanosisu" 
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
                href="https://youtube.com/@humanosisu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="YouTube"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Humano SISU</h3>
            <p className="text-gray-600 text-sm mb-4">
              Tu RH 100% digital, legal y sin complicaciones. Hecho para PYMEs como la tuya.
            </p>
            <div className="text-sm text-gray-500">
              <p>© 2025 Humano SISU</p>
              <p>Sistema de Recursos Humanos</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default DemoFooter
