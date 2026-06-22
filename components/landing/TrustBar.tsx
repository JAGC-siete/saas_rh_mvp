const CLIENTS = [
  'Restaurante Tonys Mar',
  'Prohalca',
  'Restaurante Oki Poki',
  'Paragon Financial Corp',
  'Restaurante El Chanchito SPS',
  'Enlace',
  'Grupo Gastronómico Cueva',
  'Tuchi.hn',
]

export default function TrustBar() {
  return (
    <section className="py-8 overflow-hidden border-t border-white/5" aria-label="Clientes que confían en Humano SISU">
      <p className="text-center text-xs uppercase tracking-widest text-slate-500 mb-4 font-medium">
        Empresas que confían en nosotros
      </p>
      <div className="relative">
        <div className="trust-marquee">
          {[...CLIENTS, ...CLIENTS].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="text-sm sm:text-base font-semibold text-slate-500 grayscale opacity-50 whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
