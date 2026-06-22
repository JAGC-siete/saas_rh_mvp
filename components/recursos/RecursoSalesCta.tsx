import Link from 'next/link'

export default function RecursoSalesCta() {
  return (
    <div className="mt-12 text-center glass-modern rounded-2xl p-6 sm:p-8 border border-white/10">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Automatiza esto con Humano SISU</h2>
      <p className="text-brand-200/90 mb-6 max-w-2xl mx-auto">
        Asistencia biométrica y nómina con deducciones de ley, en un solo lugar.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/activar"
          className="inline-flex justify-center py-3 px-6 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors"
        >
          Probar gratis 30 días
        </Link>
        <Link
          href="/calculadora"
          className="inline-flex justify-center py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/15 transition-colors"
        >
          Ver calculadoras
        </Link>
      </div>
    </div>
  )
}
