import Link from 'next/link'
import type { RecursoListItem } from '../../lib/recursos'

function formatDate(datePublished: string): string {
  return new Date(datePublished).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface RecursoListCardProps {
  item: RecursoListItem
}

export default function RecursoListCard({ item }: RecursoListCardProps) {
  return (
    <li>
      <Link
        href={`/recursos/${item.slug}`}
        className="group block p-5 rounded-2xl glass-modern border border-white/10 hover:border-sky-500/40 transition-all duration-300 hover:-translate-y-0.5"
      >
        <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-sky-100 transition-colors">
          {item.title}
        </h2>
        <p className="text-brand-300 text-sm mb-3 line-clamp-2">{item.description}</p>
        <time className="text-brand-400 text-xs" dateTime={item.datePublished}>
          {formatDate(item.datePublished)}
        </time>
      </Link>
    </li>
  )
}
