import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@contexts/TranslationContext';
import { useUserType } from '@contexts/UserTypeContext';
import { motion } from 'framer-motion';

const Hero: React.FC = () => {
  const { t } = useTranslation();
  const { userType } = useUserType();

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const badgeText = userType === 'employer' 
    ? t('+50 companies already found their ideal talent')
    : t('+1,200 people used it to get a job');

  const headingText = userType === 'employer'
    ? t('Turn your company into a talent magnet')
    : t('Turn your CV into a recruiter magnet');

  const subtitleText = userType === 'employer'
    ? t('From search to hire in record time with AI and 24/7 support')
    : t('From unemployed to hired in 90 days with daily feedback and $HND certification');

  const ctaText = userType === 'employer'
    ? t('Try for free')
    : t('Start free');

  return (
    <section className="hero min-h-[70vh] bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center">
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.p 
          {...fadeIn}
          className="badge inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-medium mb-8"
        >
          {badgeText}
        </motion.p>

        <motion.h2
          {...fadeIn}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
        >
          {headingText}
        </motion.h2>

        <motion.p
          {...fadeIn}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl"
        >
          {subtitleText}
        </motion.p>

        <motion.div
          {...fadeIn}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-4"
        >
          <Link
            to="/comienza-gratis"
            className="btn-primary px-8 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {ctaText}
          </Link>
          <Link
            to="/como-funciona"
            className="btn-secondary px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('See how it works')}
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;