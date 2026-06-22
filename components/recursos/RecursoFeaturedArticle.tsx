import Link from 'next/link'
import type { RecursoListItem } from '../../lib/recursos'

function formatDate(datePublished: string): string {
  return new Date(datePublished).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface RecursoFeaturedArticleProps {
  item: RecursoListItem
}

export default function RecursoFeaturedArticle({ item }: RecursoFeaturedArticleProps) {
  return (
    <Link
      href={`/recursos/${item.slug}`}
      className="group block rounded-3xl glass-modern border border-white/15 p-8 sm:p-12 min-h-[420px] flex flex-col justify-end relative overflow-hidden transition-all duration-500 hover:border-amber-400/30 hover:shadow-[0_0_60px_rgba(251,191,36,0.08)]"
    >
      <div
        className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(251,191,36,0.15), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(14,165,233,0.1), transparent 55%)',
        }}
      />
      <div className="relative z-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70 mb-4">Ensayo destacado</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight group-hover:text-amber-50 transition-colors">
          {item.title}
        </h2>
        <p className="text-brand-200/90 text-lg mb-6 line-clamp-4">{item.description}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-brand-300">
          {item.author && <span>{item.author}</span>}
          <time dateTime={item.datePublished}>{formatDate(item.datePublished)}</time>
        </div>
        <span className="inline-flex mt-8 text-amber-200/90 text-sm font-medium group-hover:translate-x-1 transition-transform">
          Leer ensayo →
        </span>
      </div>
    </Link>
  )
}
