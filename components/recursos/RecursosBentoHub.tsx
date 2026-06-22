'use client'

import Link from 'next/link'
import { useCallback, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import ArticleCountPips from './ArticleCountPips'
import { RECURSO_CATEGORY_META, type RecursoCategory } from '../../lib/recursos/categories'

interface RecursosBentoHubProps {
  counts: Record<RecursoCategory, number>
}

export default function RecursosBentoHub({ counts }: RecursosBentoHubProps) {
  const factorRef = useRef<HTMLAnchorElement>(null)

  const handleFactorMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = factorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    el.style.setProperty('--glow-x', `${x}%`)
    el.style.setProperty('--glow-y', `${y}%`)
  }, [])

  const rrhh = RECURSO_CATEGORY_META.rrhh
  const factor = RECURSO_CATEGORY_META['responsabilidad-individual']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
      <Link
        href={rrhh.path}
        className="group relative lg:col-span-3 overflow-hidden rounded-3xl glass-modern border border-white/10 p-8 sm:p-10 min-h-[280px] flex flex-col justify-between transition-all duration-500 hover:border-sky-500/40 hover:shadow-[0_0_40px_rgba(14,165,233,0.12)]"
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Colección</p>
            <ArrowUpRight className="h-5 w-5 text-white/40 group-hover:text-sky-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{rrhh.hubTitle}</h2>
          <p className="text-brand-200/90 max-w-lg">{rrhh.hubSubtitle}</p>
        </div>
        <div className="relative z-10 mt-8">
          <ArticleCountPips count={counts.rrhh} />
        </div>
      </Link>

      <Link
        ref={factorRef}
        href={factor.path}
        onMouseMove={handleFactorMouseMove}
        onMouseLeave={() => {
          const el = factorRef.current
          if (el) {
            el.style.setProperty('--glow-x', '50%')
            el.style.setProperty('--glow-y', '30%')
          }
        }}
        className="group relative lg:col-span-2 overflow-hidden rounded-3xl glass-modern border border-white/10 p-8 sm:p-10 min-h-[280px] flex flex-col justify-between transition-all duration-500 hover:border-amber-400/30 hover:shadow-[0_0_40px_rgba(251,191,36,0.1)] [--glow-x:50%] [--glow-y:30%]"
      >
        <div
          className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at var(--glow-x) var(--glow-y), rgba(251,191,36,0.22), transparent 55%)',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Colección</p>
            <ArrowUpRight className="h-5 w-5 text-white/40 group-hover:text-amber-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{factor.hubTitle}</h2>
          <p className="text-brand-200/90">{factor.hubSubtitle}</p>
        </div>
        <div className="relative z-10 mt-8">
          <ArticleCountPips
            count={counts['responsabilidad-individual']}
            activeClassName="bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
          />
        </div>
      </Link>
    </div>
  )
}
