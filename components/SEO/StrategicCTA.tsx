import React from 'react'
import Link from 'next/link'
import TrackedWhatsAppLink from '../TrackedWhatsAppLink'

interface StrategicCTAProps {
  variant?: 'primary' | 'secondary' | 'whatsapp'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ctaVariants = {
  primary: 'bg-sky-600 hover:bg-sky-700 text-white',
  secondary: 'bg-green-600 hover:bg-green-700 text-white',
  whatsapp: 'bg-green-600 hover:bg-green-700 text-white'
}

const ctaSizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg'
}

interface CTAConfig {
  text: string
  href?: string
  whatsapp?: string
  whatsappText?: string
}

const ctaConfigs: Record<string, CTAConfig> = {
  'prueba-gratis': {
    text: 'Prueba Gratis 30 Días',
    href: '/activar'
  },
  'implementacion-48h': {
    text: 'Implementación express (hasta 48 h)',
    href: '/implementacion-48-horas'
  },
  'demo-personalizada': {
    text: 'Solicita Demo Personalizada',
    whatsapp: '50432226773',
    whatsappText: 'Hola, quiero una demo personalizada de Humano SISU'
  },
  'compara-odoo': {
    text: 'Compara con Odoo Gratis',
    href: '/alternativa-odoo-honduras'
  }
}

interface StrategicCTAPropsWithType extends StrategicCTAProps {
  type: keyof typeof ctaConfigs
}

export default function StrategicCTA({
  variant = 'primary',
  size = 'md',
  className = '',
  type
}: StrategicCTAPropsWithType) {
  const config = ctaConfigs[type]
  const baseClasses = `inline-block rounded-lg font-semibold transition-colors ${ctaVariants[variant]} ${ctaSizes[size]} ${className}`

  if (config.whatsapp) {
    const whatsappUrl = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(config.whatsappText || config.text)}`
    return (
      <TrackedWhatsAppLink
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        trackingContext={`strategic_cta_${type}`}
      >
        {config.text}
      </TrackedWhatsAppLink>
    )
  }

  if (config.href) {
    return (
      <Link href={config.href} className={baseClasses}>
        {config.text}
      </Link>
    )
  }

  return null
}

