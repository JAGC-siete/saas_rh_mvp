import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Colores de series (paleta validada para el fondo oscuro de la app con el validador de dataviz:
 * banda de luminosidad, separación para daltonismo y contraste ≥ 3:1).
 */
export const SERIES = {
  onTime: '#3987e5',
  late: '#c98500',
  absent: '#d55181',
  net: '#3987e5',
  deductions: '#c98500',
} as const

export const AXIS_TEXT = '#9fb0c8'
export const GRID_LINE = 'rgba(255,255,255,0.08)'

/** Fecha YYYY-MM-DD → "8 oct" sin desplazamiento de zona horaria. */
export function shortDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-HN', { ...opts, timeZone: 'UTC' })
}

interface PanelProps {
  title: string
  subtitle?: string
  action?: { label: string; href: string }
  className?: string
  children: ReactNode
}

export function Panel({ title, subtitle, action, className = '', children }: PanelProps) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-sm p-5 flex flex-col gap-4 min-w-0 ${className}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="text-xs font-semibold text-brand-300 hover:text-brand-200">
            {action.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

export function PanelSkeleton({ className = '', height = 'h-64' }: { className?: string; height?: string }) {
  return (
    <div
      aria-hidden
      className={`rounded-2xl border border-white/10 bg-slate-900/50 animate-pulse ${height} ${className}`}
    />
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400 py-6 text-center">{children}</p>
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-300">
      <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  )
}

export function ChartTooltipBox({ title, rows }: { title: string; rows: Array<{ color: string; label: string; value: string }> }) {
  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/95 px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400 mb-1">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-white tabular-nums">
          <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
          <span className="text-slate-300">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold">{r.value}</span>
        </p>
      ))}
    </div>
  )
}
