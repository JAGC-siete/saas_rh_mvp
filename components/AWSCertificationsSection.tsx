import Image from 'next/image'
import { CheckBadgeIcon, StarIcon } from '@heroicons/react/24/solid'

export default function AWSCertificationsSection() {
  const certifications = [
    {
      name: 'AWS Solutions Architect',
      level: 'ASSOCIATE',
      icon: '/image-aws-solutions-architect.png',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      name: 'AWS Developer',
      level: 'ASSOCIATE',
      icon: '/image-aws-developer.png',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      name: 'AWS Cloud Practitioner',
      level: 'FOUNDATIONAL',
      icon: '/image-aws-cloud-practitioner.png',
      badgeColor: 'bg-gray-400/10 text-gray-300 border-gray-400/20'
    }
  ]

  return (
    <section className="py-16 bg-white/5">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">
            Desarrollado por ingenieros certificados en AWS
          </h2>
          
          <p className="text-brand-200/90 max-w-4xl mx-auto mb-8 text-lg">
            Hecho sobre la misma nube que impulsa a Netflix, Airbnb y el 90% del internet.
            <br />
            <span className="text-brand-400 font-medium">
              Optimizado para que tu empresa en Honduras tenga la seguridad y escalabilidad de un gigante, sin pagar como uno.
            </span>
            <br />
            <span className="text-white font-semibold">
              Tecnología global. Precio local.
            </span>
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
