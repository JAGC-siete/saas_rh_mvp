import Image from 'next/image'
import { CheckBadgeIcon, StarIcon } from '@heroicons/react/24/solid'

export default function AWSCertificationsSection() {
  const certifications = [
    {
      name: 'AWS Solutions Architect Associate',
      description: 'Arquitectura de soluciones cloud escalables y seguras',
      icon: '/icons/aws-solutions-architect.svg',
      level: 'Associate',
      color: 'from-orange-500 to-red-600'
    },
    {
      name: 'AWS Developer Associate',
      description: 'Desarrollo de aplicaciones cloud-native robustas',
      icon: '/icons/aws-developer.svg',
      level: 'Associate',
      color: 'from-blue-500 to-purple-600'
    },
    {
      name: 'AWS Cloud Practitioner',
      description: 'Fundamentos de AWS y mejores prácticas cloud',
      icon: '/icons/aws-cloud-practitioner.svg',
      level: 'Foundational',
      color: 'from-green-500 to-blue-600'
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-orange-600/10" />
      
      {/* Floating AWS logo background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            <CheckBadgeIcon className="h-5 w-5" />
            Certificaciones AWS Oficiales
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Construido con{' '}
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-purple-600 bg-clip-text text-transparent">
              Tecnología Enterprise
            </span>
          </h2>
          
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Nuestro equipo cuenta con certificaciones oficiales de Amazon Web Services, 
            garantizando que tu sistema de RH esté construido con las mejores prácticas 
            de la industria cloud.
          </p>
        </div>

        {/* Certifications Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {certifications.map((cert, index) => (
            <div
              key={cert.name}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-500 hover:transform hover:scale-105"
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Certification Badge */}
              <div className="relative z-10">
                <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${cert.color} text-white px-3 py-1 rounded-full text-xs font-medium mb-4`}>
                  <StarIcon className="h-4 w-4" />
                  {cert.level}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-300 transition-colors">
                  {cert.name}
                </h3>
                
                <p className="text-slate-300 text-sm leading-relaxed">
                  {cert.description}
                </p>
                
                {/* AWS Icon */}
                <div className="mt-6 flex items-center justify-center">
                  <Image
                    src={cert.icon}
                    alt={`${cert.name} icon`}
                    width={64}
                    height={64}
                    className="w-16 h-16"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Statement */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4">
            <CheckBadgeIcon className="h-6 w-6 text-green-400" />
            <span className="text-white font-medium">
              Garantía de calidad y seguridad respaldada por AWS
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
