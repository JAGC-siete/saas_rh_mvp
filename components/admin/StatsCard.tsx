import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  iconColor?: string
  valueColor?: string
  onClick?: () => void
  className?: string
}

export default function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  valueColor,
  onClick,
  className = ''
}: StatsCardProps) {
  const cardContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/90">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${iconColor || 'text-white/70'}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold text-white ${valueColor || ''}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="text-xs text-white/70 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </>
  )

  if (onClick) {
    return (
      <Card 
        variant="glass"
        className={`border-white/10 hover:border-white/30 transition-all cursor-pointer ${className}`}
        onClick={onClick}
      >
        {cardContent}
      </Card>
    )
  }

  return (
    <Card variant="glass" className={`border-white/10 ${className}`}>
      {cardContent}
    </Card>
  )
}








