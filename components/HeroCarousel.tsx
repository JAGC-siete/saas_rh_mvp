import { useState, useEffect, useRef } from 'react'

interface Slide {
  id: string
  title: string
  subtitle: string
  ctaText: string
  ctaHref: string
}

const SLIDES: Slide[] = [
  {
    id: "cero-errores",
    title: "0 errores. 0 dramas. 0 pasivo laboral.",
    subtitle: "Haz la planilla como un robot: precisa, puntual y sin estrés.",
    ctaText: "🚀 Actívalo hoy",
    ctaHref: "/activar",
  },
  {
    id: "cumplimiento",
    title: "IHSS, RAP e ISR calculados al centavo.",
    subtitle: "Evita multas, reclamos y auditorías. Tu planilla, siempre en regla.",
    ctaText: "⚡ Activar ahora",
    ctaHref: "/activar",
  },
  {
    id: "tranquilidad",
    title: "Adiós a las madrugadas corrigiendo planillas.",
    subtitle: "Todo correcto y a tiempo, cada quincena.",
    ctaText: "🎯 Automatízalo ya",
    ctaHref: "/activar",
  },
  {
    id: "transparencia",
    title: "Historial claro y vouchers individuales por empleado.",
    subtitle: "Cero discusiones.",
    ctaText: "🎯 Solicitar Demo",
    ctaHref: "/activar",
  },
  {
    id: "un-clic",
    title: "Genera planilla y vouchers en segundos.",
    subtitle: "Sin plantillas, sin copiar y pegar, sin margen de error.",
    ctaText: "🔥 Pruébalo gratis",
    ctaHref: "/activar",
  },
]

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const timerRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalMs = 5000

  // Autoplay (respeta reduced motion y visibilidad de pestaña)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const start = () => {
      if (mq.matches || document.hidden) return
      stop()
      timerRef.current = window.setInterval(() => {
        setIndex((i) => (i + 1) % SLIDES.length)
      }, intervalMs)
    }
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    start()
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [intervalMs])

  const goTo = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length)
  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)

  // Swipe simple
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let startX = 0
    const onStart = (e: TouchEvent) => (startX = e.touches[0].clientX)
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX
      if (Math.abs(dx) > 60) {
        dx < 0 ? next() : prev()
        startX = e.touches[0].clientX + (dx < 0 ? -9999 : 9999) // evita triggers múltiples
      }
    }
    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
    }
  }, [index])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Beneficios del SaaS"
      className="relative overflow-hidden text-white"
      style={{ zIndex: 20, position: 'relative', minHeight: '400px', marginTop: '8rem' }}
      onMouseEnter={() => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }}
      onMouseLeave={() => {
        if (!timerRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !document.hidden) {
          timerRef.current = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), intervalMs)
        }
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div 
          ref={containerRef}
          className="rounded-2xl px-6 py-8 md:px-12 md:py-12"
        >
          {SLIDES.map((s, i) => (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${SLIDES.length}`}
              className={`transition-all duration-700 ease-out ${i === index ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}
            >
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight text-center mb-6">
                {s.title}
              </h2>
              <p className="text-lg text-slate-300 max-w-3xl mx-auto text-center mb-8">
                {s.subtitle}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href={s.ctaHref}
                  className="btn btn-primary h-12 px-8"
                  aria-label={`${s.ctaText} - ${s.title}`}
                >
                  {s.ctaText}
                </a>
                <a
                  href="/demo"
                  className="btn btn-ghost h-12 px-8"
                  aria-label="Solicitar demo de 15 minutos"
                >
                  🎯 Solicitar Demo
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controles del carrusel */}
      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-4">
        <button
          aria-label="Slide anterior"
          onClick={prev}
          className="rounded-full p-3 bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <span className="text-white/80 hover:text-white transition-colors duration-300">◀</span>
        </button>
        
        <div className="flex gap-3 p-2 rounded-full">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={i === index}
              data-active={i === index}
              onClick={() => goTo(i)}
              className="h-2.5 w-2.5 rounded-full bg-white/20 transition-all duration-500 hover:scale-110 data-[active=true]:bg-white data-[active=true]:scale-110"
            />
          ))}
        </div>
        
        <button
          aria-label="Slide siguiente"
          onClick={next}
          className="rounded-full p-3 bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <span className="text-white/80 hover:text-white transition-colors duration-300">▶</span>
        </button>
      </div>
    </section>
  )
}
