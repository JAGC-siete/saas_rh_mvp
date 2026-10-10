import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/utils'

const SECTIONS = [
  { href: '/app/attendance/dashboard', label: 'Resumen' },
  { href: '/app/attendance/daily-close', label: 'Cierre del día' },
  { href: '/app/attendance/corrections', label: 'Correcciones' },
  { href: '/app/attendance/scheduling', label: 'Turnos' },
] as const

/** Navegación entre las páginas del módulo de asistencia (solo administradores). */
export default function AttendanceSectionNav({ className }: { className?: string }) {
  const router = useRouter()
  const { userProfile } = useAuth()

  // Los empleados también abren Correcciones; no deben ver las secciones de administración.
  if ((userProfile?.role || '').toLowerCase() === 'employee') return null

  return (
    <nav aria-label="Secciones de asistencia" className={cn('flex flex-wrap gap-2', className)}>
      {SECTIONS.map((s) => {
        const active = router.pathname === s.href
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-600 text-white'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white'
            )}
          >
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}
