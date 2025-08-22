import Image from 'next/image'
import { CheckBadgeIcon, StarIcon } from '@heroicons/react/24/solid'

export default function AWSCertificationsSection() {
  const certifications = [
    {
      name: 'AWS Solutions Architect',
      level: 'ASSOCIATE',
      icon: '/icons/aws-solutions-architect.svg',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      name: 'AWS Developer',
      level: 'ASSOCIATE',
      icon: '/icons/aws-developer.svg',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      name: 'AWS Cloud Practitioner',
      level: 'FOUNDATIONAL',
      icon: '/icons/aws-cloud-practitioner.svg',
      badgeColor: 'bg-gray-400/10 text-gray-300 border-gray-400/20'
    }
  ]

  return (
    <section className="py-16 bg-white/5">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">
            Construido con{' '}
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-purple-600 bg-clip-text text-transparent">
              Tecnología Enterprise
            </span>
          </h2>
          
          <p className="text-brand-200/90 max-w-3xl mx-auto mb-8">
            Nuestro equipo cuenta con certificaciones oficiales de Amazon Web Services, 
            garantizando que tu sistema de RH esté construido con las mejores prácticas 
            de la industria cloud.
          </p>

          {/* AWS Certification Badges - EXACTAMENTE como en la barra superior */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8">
            {certifications.map((cert, index) => (
              <div
                key={cert.name}
                className={`inline-flex items-center gap-3 ${cert.badgeColor} px-4 py-2 rounded-full border transition-all duration-300 hover:-translate-y-0.5`}
              >
                {/* AWS Logo */}
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image
                    src={cert.icon}
                    alt={`${cert.name} logo`}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                
                {/* Texto de la certificación */}
                <div className="text-sm font-medium text-white">
                  {cert.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Statement - usando el mismo estilo glass */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-green-500/10 text-green-400 px-4 py-2 rounded-full border border-green-500/20 hover:bg-green-500/20 transition-all duration-300 hover:-translate-y-0.5">
            <CheckBadgeIcon className="h-5 w-5" />
            <span className="font-medium">
              Garantía de calidad y seguridad respaldada por AWS
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
