import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@contexts/TranslationContext';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img
              className="h-8 w-auto"
              src="/assets/logo-humano-sisu.svg"
              alt="Humano SISU"
            />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('Your comprehensive HR management solution')}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {t('Solutions')}
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/asesoria-laboral" className="text-base text-gray-500 dark:text-gray-400 hover:text-blue-600">
                  {t('Placement Service')}
                </Link>
              </li>
              <li>
                <Link to="/reclutamiento" className="text-base text-gray-500 dark:text-gray-400 hover:text-blue-600">
                  {t('RecluBot')}
                </Link>
              </li>
              <li>
                <Link to="/robots" className="text-base text-gray-500 dark:text-gray-400 hover:text-blue-600">
                  {t('Robots')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {t('Company')}
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/como-funciona" className="text-base text-gray-500 dark:text-gray-400 hover:text-blue-600">
                  {t('How It Works')}
                </Link>
              </li>
              <li>
                <Link to="/comienza-gratis" className="text-base text-gray-500 dark:text-gray-400 hover:text-blue-600">
                  {t('Start Free')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {t('Contact')}
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <a href="mailto:contacto@humanosisu.com" className="text-base text-gray-500 dark:text-gray-400 hover:text-blue-600">
                  contacto@humanosisu.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8 flex justify-between">
          <p className="text-base text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Humano SISU. {t('All rights reserved')}.
          </p>
          <div className="flex space-x-6">
            <select
              onChange={(e) => e.target.value}
              className="form-select bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700 rounded-md shadow-sm"
            >
              <option value="es">🇪🇸 Español</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;