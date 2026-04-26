import React from 'react'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

export type JournalStatus = 'no_generado' | 'draft' | 'posted'

interface StatusBadgeProps {
  status: JournalStatus
  className?: string
}

const LABELS: Record<JournalStatus, string> = {
  no_generado: 'No generado',
  draft: 'Borrador',
  posted: 'Aprobado'
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant =
    status === 'no_generado'
      ? 'secondary'
      : status === 'draft'
        ? 'outline'
        : 'default'

  const colorClass =
    status === 'no_generado'
      ? 'bg-gray-500/20 text-gray-300 border-gray-500/40'
      : status === 'draft'
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'

  return (
    <Badge
      variant={variant}
      className={cn(colorClass, className)}
    >
      {LABELS[status]}
    </Badge>
  )
}
