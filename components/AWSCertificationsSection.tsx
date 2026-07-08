import Image from 'next/image'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import ScrollReveal from './landing/ScrollReveal'
import BorderBeam from './landing/BorderBeam'

const certifications = [
  { name: 'AWS Solutions Architect', icon: '/image-aws-solutions-architect.png' },
  { name: 'AWS Developer', icon: '/image-aws-developer.png' },
  { name: 'AWS Cloud Practitioner', icon: '/image-aws-cloud-practitioner.png' },
]

export default function AWSCertificationsSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
              Potenciada con la tecnología de la nube utilizada por gigantes mundiales como Netflix o Airbnb.
            </h2>
            <p className="text-slate-400 max-w-4xl mx-auto mb-4 text-base sm:text-lg font-medium landing-dark-text">
              Diseñada por ingenieros certificados
            </p>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto font-medium">
              <span className="text-white font-semibold">Datos seguros:</span> Infraestructura AWS regional encriptada
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {certifications.map((cert, i) => (
            <ScrollReveal key={cert.name} delay={i * 0.08}>
              <BorderBeam>
                <div className="glass-modern rounded-2xl p-4 flex flex-col items-center text-center hover:scale-[1.01] transition-transform">
                  <Image src={cert.icon} alt={`${cert.name} logo`} width={80} height={80} className="w-20 h-20 mb-3" />
                  <div className="text-sm font-medium text-white">{cert.name}</div>
                </div>
              </BorderBeam>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.2}>
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-green-500/10 text-green-400 px-4 py-2 rounded-full border border-green-500/20">
              <CheckBadgeIcon className="h-5 w-5" />
              <span className="font-medium text-sm">Garantía de calidad y seguridad certificada por AWS</span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
