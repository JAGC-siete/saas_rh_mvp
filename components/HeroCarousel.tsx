import { useEffect, useRef, useState } from "react";

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
};

const SLIDES: Slide[] = [
  {
    id: "cero-errores",
    title: "0 errores. 0 dramas. 0 pasivo laboral.",
    subtitle: "Haz la planilla como un robot: precisa, puntual y sin estrés.",
    ctaText: "Actívalo hoy",
    ctaHref: "/activar",
  },
  {
    id: "cumplimiento",
    title: "IHSS, RAP e ISR calculados al centavo.",
    subtitle: "Evita multas, reclamos y auditorías. Tu planilla, siempre en regla.",
    ctaText: "Ver cómo funciona",
    ctaHref: "/demo",
  },
  {
    id: "tranquilidad",
    title: "Adiós a las madrugadas corrigiendo planillas.",
    subtitle: "Todo correcto y a tiempo, cada quincena.",
    ctaText: "Automatízalo ya",
    ctaHref: "/activar",
  },
  {
    id: "transparencia",
    title: "Historial claro y vouchers individuales por empleado.",
    subtitle: "Transparencia interna y cero discusiones.",
    ctaText: "Ver reportes",
    ctaHref: "/app/reports",
  },
  {
    id: "un-clic",
    title: "Genera planilla y vouchers en segundos.",
    subtitle: "Sin plantillas, sin copiar y pegar, sin margen de error.",
    ctaText: "Pruébalo gratis",
    ctaHref: "/demo",
  },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalMs = 4500;

  // Debug: verificar que el componente se renderice
  console.log('🎠 HeroCarousel renderizando, index:', index);

  // autoplay (respeta reduced motion y visibilidad de pestaña)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = () => {
      if (mq.matches || document.hidden) return;
      stop();
      timerRef.current = window.setInterval(() => {
        setIndex((i) => (i + 1) % SLIDES.length);
      }, intervalMs);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    start();
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const goTo = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // swipe simple
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    const onStart = (e: TouchEvent) => (startX = e.touches[0].clientX);
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > 60) {
        dx < 0 ? next() : prev();
        startX = e.touches[0].clientX + (dx < 0 ? -9999 : 9999); // evita triggers múltiples
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
    };
  }, [index]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Beneficios del SaaS"
      className="relative overflow-hidden bg-[#0f2147] text-white"
      style={{ zIndex: 20, position: 'relative', minHeight: '400px', marginTop: '8rem' }}
      onMouseEnter={() => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }}
      onMouseLeave={() => {
        if (!timerRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !document.hidden) {
          timerRef.current = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), intervalMs);
        }
      }}
    >
      <div ref={containerRef} className="mx-auto max-w-6xl px-6 py-12 border-4 border-red-500 bg-red-100/10">
        {/* DEBUG TEXT */}
        <div className="text-center mb-8 p-4 bg-yellow-400 text-black font-bold text-2xl">
          🎠 CARRUSEL DEBUG - DEBERÍA SER VISIBLE
        </div>
        
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${SLIDES.length}`}
            className={`transition-opacity duration-500 ${i === index ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}
          >
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
              {s.title}
            </h1>
            <p className="mt-4 text-lg sm:text-2xl text-white/80 max-w-3xl">
              {s.subtitle}
            </p>
            <div className="mt-8 flex gap-3">
              <a
                href={s.ctaHref}
                className="rounded-2xl px-6 py-3 text-base font-semibold bg-blue-500 hover:bg-blue-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                {s.ctaText}
              </a>
              <a
                href="/demo"
                className="rounded-2xl px-6 py-3 text-base font-semibold border border-white/25 hover:border-white/50"
              >
                Solicitar Demo
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
        <button
          aria-label="Anterior"
          onClick={prev}
          className="rounded-full px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur"
        >
          ◀
        </button>
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-2 w-6 rounded-full transition-all ${
                i === index ? "bg-white" : "bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
        <button
          aria-label="Siguiente"
          onClick={next}
          className="rounded-full px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur"
        >
          ▶
        </button>
      </div>
    </section>
  );
}
