import React, { useState } from 'react';
import { useTranslation } from '@contexts/TranslationContext';
import { motion } from 'framer-motion';

interface AttendanceFormData {
  last5: string;
  justification?: string;
}

interface AttendanceResponse {
  message: string;
  requireJustification?: boolean;
}

const AsistenciaPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AttendanceFormData>({ last5: '' });
  const [message, setMessage] = useState<string>('');
  const [showJustification, setShowJustification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data: AttendanceResponse = await response.json();

      if (response.status === 200) {
        setMessage(data.message);
        setShowJustification(false);
        // Clear form after success
        setTimeout(() => {
          setFormData({ last5: '' });
          setMessage('');
        }, 4000);
      } else if (response.status === 422 && data.requireJustification) {
        setShowJustification(true);
        setMessage(data.message);
      } else {
        setMessage(data.message || t('Error registering attendance'));
      }
    } catch (err) {
      setMessage(t('Connection error. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateLast5 = (value: string) => {
    return /^\d{5}$/.test(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <motion.div
        initial="initial"
        animate="animate"
        className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8"
      >
        <motion.div
          {...fadeIn}
          className="bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-8"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            {t('Attendance Registration')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="last5"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('Last 5 digits of ID')}:
              </label>
              <input
                type="text"
                id="last5"
                name="last5"
                maxLength={5}
                value={formData.last5}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm ${
                  formData.last5 && !validateLast5(formData.last5)
                    ? 'border-red-500'
                    : ''
                }`}
                placeholder="00731"
              />
              {formData.last5 && !validateLast5(formData.last5) && (
                <p className="mt-1 text-sm text-red-600">
                  {t('Please enter exactly 5 digits')}
                </p>
              )}
            </div>

            {showJustification && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label
                  htmlFor="justification"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t('Justification')}:
                </label>
                <textarea
                  id="justification"
                  name="justification"
                  rows={3}
                  value={formData.justification || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder={t('Why were you late?')}
                />
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!validateLast5(formData.last5) || isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? t('Processing...') : t('Register Attendance')}
            </button>
          </form>

          {message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-4 p-4 rounded-md ${
                message.includes('✅') || message.includes('🎉')
                  ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}
            >
              {message}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AsistenciaPage;