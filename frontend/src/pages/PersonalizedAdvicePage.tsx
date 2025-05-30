import React from 'react';
import { useTranslation } from '@contexts/TranslationContext';

const PersonalizedAdvicePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          {t('Personalized Advice')}
        </h1>
        <div className="mt-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            {t('Get expert HR advice tailored to your business needs')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default PersonalizedAdvicePage;