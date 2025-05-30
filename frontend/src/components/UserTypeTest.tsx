import React from 'react';
import { useUserType } from '@contexts/UserTypeContext';
import { useTranslation } from '@contexts/TranslationContext';

const UserTypeTest: React.FC = () => {
  const { userType, setUserType } = useUserType();
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50">
      <h3 className="font-bold mb-2">{t('User Type')}: {userType === 'employer' ? t('Company') : t('Candidate')}</h3>
      <div className="flex space-x-2">
        <button 
          onClick={() => setUserType('employee')}
          className={`px-3 py-1 rounded ${userType === 'employee' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          {t('Candidate')}
        </button>
        <button 
          onClick={() => setUserType('employer')}
          className={`px-3 py-1 rounded ${userType === 'employer' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          {t('Company')}
        </button>
      </div>
    </div>
  );
};

export default UserTypeTest;
