import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { RELATED_GUIDES, GUIDE_LINKS } from '../../lib/seo/internal-links'

interface RelatedGuidesProps {
  /** Ruta de la página actual (sin trailing slash). Define qué guías mostrar. */
  currentPath: string
  className?: string
}

/** Bloque "También te puede interesar" para conectar landings SEO entre sí. */
export default function RelatedGuides({ currentPath, className = '' }: RelatedGuidesProps) {
  const keys = RELATED_GUIDES[currentPath]
  if (!keys || keys.length === 0) return null

  return (
    <section className={`mb-12 sm:mb-16 ${className}`}>
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-white">
        También te puede interesar
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {keys.map((key) => {
          const guide = GUIDE_LINKS[key]
          return (
            <Link
              key={guide.href}
              href={guide.href}
              className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-brand-400/40 transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white group-hover:text-brand-200">{guide.label}</h3>
                <ArrowRightIcon className="h-4 w-4 text-brand-300 flex-shrink-0 mt-1" aria-hidden />
              </div>
              {guide.description && (
                <p className="text-sm text-brand-200/80 mt-1">{guide.description}</p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
