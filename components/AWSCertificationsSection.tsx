import Image from 'next/image'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'next-i18next'

export default function AWSCertificationsSection() {
  const { t } = useTranslation('landing')
  const certifications = t('aws.certifications', { returnObjects: true }) as any[]

  return (
    <section className="py-16 bg-white/5">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">{t('aws.title')}</h2>

          <p className="text-brand-200/90 max-w-4xl mx-auto mb-8 text-lg">
            {t('aws.tagline1')}
            <br />
            <span className="text-brand-400 font-medium">{t('aws.tagline2')}</span>
            <br />
            <span className="text-white font-semibold">{t('aws.tagline3')}</span>
          </p>

          {/* AWS Certification Badges - EXACTAMENTE como en la barra superior */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8">
            {certifications.map((cert, index) => (
              <div
                key={cert.name}
                className={`inline-flex items-center gap-3 ${cert.badgeColor} px-4 py-2 rounded-full border transition-all duration-300 hover:-translate-y-0.5`}
              >
                {/* AWS Logo - 3x más grande */}
                <div className="w-24 h-24 flex items-center justify-center">
                  <Image
                    src={cert.icon}
                    alt={`${cert.name} logo`}
                    width={96}
                    height={96}
                    className="w-24 h-24"
                  />
                </div>
                
                {/* Texto de la certificación */}
                <div className="text-sm font-medium text-white">{cert.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Statement - usando el mismo estilo glass */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-green-500/10 text-green-400 px-4 py-2 rounded-full border border-green-500/20 hover:bg-green-500/20 transition-all duration-300 hover:-translate-y-0.5">
            <CheckBadgeIcon className="h-5 w-5" />
            <span className="font-medium">{t('aws.guarantee')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
