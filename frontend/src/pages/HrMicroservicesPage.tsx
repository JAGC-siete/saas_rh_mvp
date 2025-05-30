import React from 'react';
import { useTranslation } from '@contexts/TranslationContext';

const HrMicroservicesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          {t('HR Microservices')}
        </h1>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('Attendance Management')}
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('Payroll Processing')}
            </h2>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HrMicroservicesPage;