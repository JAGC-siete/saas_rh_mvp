import Image from 'next/image'
import ScrollReveal from './landing/ScrollReveal'
import BorderBeam from './landing/BorderBeam'
import { getHomeCopy } from '../lib/i18n/landings/home'
import { useLandingPreferences } from './landing/LandingPreferencesProvider'

const certifications = [
  { name: 'AWS Solutions Architect', icon: '/image-aws-solutions-architect.png' },
  { name: 'AWS Developer', icon: '/image-aws-developer.png' },
  { name: 'AWS Cloud Practitioner', icon: '/image-aws-cloud-practitioner.png' },
]

export default function AWSCertificationsSection() {
  const { locale } = useLandingPreferences()
  const copy = getHomeCopy(locale).aws

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold landing-ink mb-4">{copy.title}</h2>
            <p className="landing-muted max-w-2xl mx-auto text-base sm:text-lg font-medium landing-dark-text">
              {copy.dataSecure}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {certifications.map((cert, i) => (
            <ScrollReveal key={cert.name} delay={i * 0.08}>
              <BorderBeam>
                <div className="glass-modern rounded-2xl p-4 flex flex-col items-center text-center hover:scale-[1.01] transition-transform">
                  <Image src={cert.icon} alt={`${cert.name} logo`} width={80} height={80} className="w-20 h-20 mb-3" />
                  <div className="text-sm font-medium landing-ink">{cert.name}</div>
                </div>
              </BorderBeam>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
