import React from 'react'

interface TrustBadge {
  text: string
  icon?: string
  color?: 'green' | 'blue' | 'purple' | 'orange'
}

const badgeColors = {
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
}

const defaultBadges: TrustBadge[] = [
  {
    text: '100% Hondureño',
    icon: '🇭🇳',
    color: 'green'
  },
  {
    text: 'Cumplimiento STSS',
    icon: '✅',
    color: 'green'
  },
  {
    text: 'Implementación 48h',
    icon: '⚡',
    color: 'blue'
  },
  {
    text: '30 días gratis',
    icon: '🎁',
    color: 'purple'
  }
]

interface TrustBadgesProps {
  badges?: TrustBadge[]
  className?: string
}

export default function TrustBadges({ badges = defaultBadges, className = '' }: TrustBadgesProps) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 ${className}`}>
      {badges.map((badge, index) => (
        <span
          key={index}
          className={`px-3 py-1 ${badgeColors[badge.color || 'green']} text-xs rounded-full border transition-all duration-300 hover:-translate-y-0.5`}
        >
          {badge.icon && <span className="mr-1">{badge.icon}</span>}
          {badge.text}
        </span>
      ))}
    </div>
  )
}

