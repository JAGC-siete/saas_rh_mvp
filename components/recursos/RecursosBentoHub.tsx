'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import ArticleCountPips from './ArticleCountPips'
import { RECURSO_CATEGORY_META, type RecursoCategory } from '../../lib/recursos/categories'
import { SPOTLIGHT_ACCENTS, SpotlightGlowOverlay, useSpotlightGlow } from '../ui/spotlightGlow'

interface RecursosBentoHubProps {
  counts: Record<RecursoCategory, number>
}

export default function RecursosBentoHub({ counts }: RecursosBentoHubProps) {
  const rrhhGlow = useSpotlightGlow<HTMLAnchorElement>()
  const factorGlow = useSpotlightGlow<HTMLAnchorElement>()

  const rrhh = RECURSO_CATEGORY_META.rrhh
  const factor = RECURSO_CATEGORY_META['responsabilidad-individual']
  const green = SPOTLIGHT_ACCENTS.green
  const gold = SPOTLIGHT_ACCENTS.gold

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
      <Link
        ref={rrhhGlow.ref}
        href={rrhh.path}
        onMouseMove={rrhhGlow.onMouseMove}
        onMouseLeave={rrhhGlow.onMouseLeave}
        className={`group relative lg:col-span-3 overflow-hidden rounded-3xl glass-modern border border-white/10 p-8 sm:p-10 min-h-[280px] flex flex-col justify-between transition-all duration-500 [--glow-x:50%] [--glow-y:30%] ${green.borderHover} ${green.shadowHover}`}
      >
        <SpotlightGlowOverlay glow={green.glow} baseOpacity="opacity-0" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <p className={`text-xs uppercase tracking-[0.35em] ${green.eyebrow}`}>Colección</p>
            <ArrowUpRight
              className={`h-5 w-5 text-white/40 ${green.arrowHover} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all`}
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{rrhh.hubTitle}</h2>
          <p className="text-brand-200/90 max-w-lg">{rrhh.hubSubtitle}</p>
        </div>
        <div className="relative z-10 mt-8">
          <ArticleCountPips count={counts.rrhh} activeClassName={green.pipActive} />
        </div>
      </Link>

      <Link
        ref={factorGlow.ref}
        href={factor.path}
        onMouseMove={factorGlow.onMouseMove}
        onMouseLeave={factorGlow.onMouseLeave}
        className={`group relative lg:col-span-2 overflow-hidden rounded-3xl glass-modern border border-white/10 p-8 sm:p-10 min-h-[280px] flex flex-col justify-between transition-all duration-500 [--glow-x:50%] [--glow-y:30%] ${gold.borderHover} ${gold.shadowHover}`}
      >
        <SpotlightGlowOverlay glow={gold.glow} baseOpacity="opacity-50" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <p className={`text-xs uppercase tracking-[0.35em] ${gold.eyebrow}`}>Colección</p>
            <ArrowUpRight
              className={`h-5 w-5 text-white/40 ${gold.arrowHover} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all`}
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{factor.hubTitle}</h2>
          <p className="text-brand-200/90">{factor.hubSubtitle}</p>
        </div>
        <div className="relative z-10 mt-8">
          <ArticleCountPips count={counts['responsabilidad-individual']} activeClassName={gold.pipActive} />
        </div>
      </Link>
    </div>
  )
}
