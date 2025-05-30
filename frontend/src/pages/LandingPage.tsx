import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from '@contexts/TranslationContext';
import { fadeInUp, staggerContainer, scaleIn } from '@utils/animations';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [heroRef, heroInView] = useInView({ triggerOnce: true });
  const [featuresRef, featuresInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div
          ref={heroRef}
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="pt-20 pb-16 text-center lg:pt-32"
        >
          <motion.div
            variants={fadeInUp}
            className="mb-8 text-blue-600 font-semibold text-lg"
          >
            {t('+1,200 people used it to get a job')}
          </motion.div>

          <motion.h1 
            variants={fadeInUp}
            className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl"
          >
            {t('Turn your CV into a recruiter magnet')}
          </motion.h1>
          
          <motion.p 
            variants={fadeInUp}
            className="mt-6 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300"
          >
            {t('From unemployed to hired in 90 days with daily feedback and $HND certification')}
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-10 flex justify-center gap-4"
          >
            <Link
              to="/comienza-gratis"
              className="px-8 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              {t('Start free')}
            </Link>
            <Link
              to="/como-funciona"
              className="px-8 py-3 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t('See how it works')}
            </Link>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          ref={featuresRef}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="py-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12"
          >
            {t('Our Solutions')}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              variants={scaleIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('Personalized Advice')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('Get expert HR advice tailored to your business needs')}
              </p>
              <Link
                to="/asesoria-laboral"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('Learn More')} →
              </Link>
            </motion.div>

            <motion.div
              variants={scaleIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('Automated Recruitment')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('Streamline your recruitment process with AI-powered tools')}
              </p>
              <Link
                to="/reclutamiento"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('Learn More')} →
              </Link>
            </motion.div>

            <motion.div
              variants={scaleIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('HR Microservices')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('Automate your HR processes with our specialized microservices')}
              </p>
              <Link
                to="/robots"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('Learn More')} →
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LandingPage;