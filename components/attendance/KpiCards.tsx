import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '../ui/card'
import type { KpiFilter } from '../../lib/attendance/kpi-filter'

interface KpiCardsProps {
  presentes: number
  ausentes: number
  permisosPagados?: number
  temprano: number
  tarde: number
  presetLabel?: string
  loading?: boolean
  activeFilter?: KpiFilter
  onFilterChange?: (filter: KpiFilter) => void
}

export default function KpiCards({
  presentes,
  ausentes,
  permisosPagados = 0,
  temprano,
  tarde,
  presetLabel = '',
  loading = false,
  activeFilter = 'all',
  onFilterChange,
}: KpiCardsProps) {
  const items: {
    id: KpiFilter
    label: string
    value: number
    color: string
    bgColor: string
    borderColor: string
    activeRing: string
    Icon: typeof CheckCircleIcon
    pulse?: boolean
    filterable?: boolean
  }[] = [
    {
      id: 'presentes',
      label: 'Presentes',
      value: presentes,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      activeRing: 'ring-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.15)]',
      Icon: CheckCircleIcon,
    },
    {
      id: 'ausentes',
      label: 'Ausentes',
      value: ausentes,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      activeRing: 'ring-red-400/50 shadow-[0_0_20px_rgba(248,113,113,0.15)]',
      Icon: XCircleIcon,
      pulse: ausentes > 0,
    },
    ...(permisosPagados > 0
      ? [{
          id: 'all' as KpiFilter,
          label: 'Permiso pagado',
          value: permisosPagados,
          color: 'text-violet-400',
          bgColor: 'bg-violet-500/10',
          borderColor: 'border-violet-500/30',
          activeRing: 'ring-violet-400/50',
          Icon: CheckCircleIcon,
          filterable: false,
        }]
      : []),
    {
      id: 'temprano',
      label: 'Temprano',
      value: temprano,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      activeRing: 'ring-blue-400/50',
      Icon: ClockIcon,
    },
    {
      id: 'tarde',
      label: 'Tarde',
      value: tarde,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      activeRing: 'ring-amber-400/50',
      Icon: ExclamationTriangleIcon,
    },
  ]

  const handleClick = (id: KpiFilter, filterable = true) => {
    if (!onFilterChange || !filterable) return
    onFilterChange(activeFilter === id ? 'all' : id)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="liquid" className="border border-white/10">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-700 rounded animate-pulse mb-3" />
              <div className="h-10 bg-gray-700 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((k) => {
        const isActive = k.filterable !== false && activeFilter === k.id
        const canFilter = onFilterChange && k.filterable !== false
        return (
          <motion.div
            key={`${k.id}-${k.label}`}
            layout
            whileHover={{ scale: canFilter ? 1.02 : 1 }}
            whileTap={{ scale: canFilter ? 0.98 : 1 }}
          >
            <Card
              variant="liquid"
              className={`border transition-all duration-300 ${
                isActive
                  ? `${k.borderColor} ring-2 ${k.activeRing}`
                  : `${k.borderColor} hover:border-white/25`
              } ${canFilter ? 'cursor-pointer' : ''} ${k.pulse && !isActive ? 'animate-pulse-slow' : ''}`}
              onClick={() => handleClick(k.id, k.filterable !== false)}
              role={canFilter ? 'button' : undefined}
              aria-pressed={canFilter ? isActive : undefined}
              tabIndex={canFilter ? 0 : undefined}
              onKeyDown={(e) => {
                if (canFilter && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  handleClick(k.id, k.filterable !== false)
                }
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <k.Icon className={`h-7 w-7 ${k.color}`} aria-hidden />
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wider text-brand-300 font-semibold">
                      Filtro
                    </span>
                  )}
                </div>
                <div className={`text-4xl font-bold mb-1 tabular-nums ${k.color}`}>{k.value}</div>
                <div className="text-sm text-gray-300 font-medium">
                  {k.label}
                  {presetLabel}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
