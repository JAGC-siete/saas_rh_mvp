import Link from 'next/link'

interface RecursoAuthorSignatureProps {
  author?: string
}

export default function RecursoAuthorSignature({ author }: RecursoAuthorSignatureProps) {
  const displayName = author ?? 'Licenciado Jorge Arturo Gómez Coello'

  return (
    <div className="mt-12 rounded-2xl glass-modern border border-white/10 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-sky-500/20 border border-white/15 flex items-center justify-center text-2xl font-bold text-white/90">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-1">Sobre el autor</p>
          <p className="text-lg font-semibold text-white">{displayName}</p>
          <p className="text-brand-300 text-sm mt-1">
            Reflexiones sobre responsabilidad, liderazgo y arquitectura del ser.
          </p>
        </div>
        <Link
          href="/recursos/rrhh"
          className="inline-flex justify-center py-2.5 px-5 text-sm font-medium text-white/90 rounded-xl border border-white/20 hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          Explorar soluciones para mi empresa
        </Link>
      </div>
    </div>
  )
}
