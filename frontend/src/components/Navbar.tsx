import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@contexts/TranslationContext';
import { useTheme } from '@contexts/ThemeContext';
import { useUserType } from '@contexts/UserTypeContext';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { userType, setUserType } = useUserType();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md dark:bg-gray-800 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="block h-12 w-auto">
              <img
                src="/assets/logo-humano-sisu.svg"
                alt="Humano SISU"
                className="h-full w-auto"
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              <Link
                to="/como-funciona"
                className="text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('How It Works')}
              </Link>
              <Link
                to="/asesoria-laboral"
                className="text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('Personalized Advice')}
              </Link>
              <Link
                to="/reclutamiento"
                className="text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('Automated Recruitment')}
              </Link>
              <Link
                to="/robots"
                className="text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('HR Microservices')}
              </Link>
            </div>

            {/* User Type Switch */}
            <div className="relative flex items-center space-x-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userType === 'employer'}
                  onChange={(e) => setUserType(e.target.checked ? 'employer' : 'employee')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                  {userType === 'employer' ? t('Employer') : t('Employee')}
                </span>
              </label>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Language Switch */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
              className="form-select bg-transparent border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-900 dark:text-gray-300 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en">🇺🇸 EN</option>
              <option value="es">🇪🇸 ES</option>
            </select>

            {/* Start Free Button */}
            <Link
              to="/comienza-gratis"
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t('Start Free')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/como-funciona"
                className="block text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                {t('How It Works')}
              </Link>
              <Link
                to="/asesoria-laboral"
                className="block text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                {t('Personalized Advice')}
              </Link>
              <Link
                to="/reclutamiento"
                className="block text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                {t('Automated Recruitment')}
              </Link>
              <Link
                to="/robots"
                className="block text-gray-900 dark:text-white hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                {t('HR Microservices')}
              </Link>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                    {t('User Type')}:
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userType === 'employer'}
                      onChange={(e) => setUserType(e.target.checked ? 'employer' : 'employee')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                      {userType === 'employer' ? t('Employer') : t('Employee')}
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                    {t('Theme')}:
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    {theme === 'dark' ? '🌞' : '🌙'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                    {t('Language')}:
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
                    className="form-select bg-transparent border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-900 dark:text-gray-300"
                  >
                    <option value="en">🇺🇸 EN</option>
                    <option value="es">🇪🇸 ES</option>
                  </select>
                </div>

                <Link
                  to="/comienza-gratis"
                  className="w-full text-center bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  {t('Start Free')}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;