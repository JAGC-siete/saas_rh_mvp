import React from "react";
import ImageCarousel from "./ImageCarousel";

export default function LandingHero() {
  // Función simple para obtener la próxima quincena
  const getNextPayday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = now.getDate();
    
    const fifteenth = new Date(y, m, 15, 23, 59, 59);
    const lastOfMonth = new Date(y, m + 1, 0, 23, 59, 59);
    
    return day <= 15 ? fifteenth : lastOfMonth;
  };

  const nextPayday = getNextPayday();

  return (
    <div className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="glass-strong rounded-3xl p-8 lg:p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Copy */}
            <div className="space-y-6 text-left">

              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white">
                ¿Otra quincena corriendo detrás de la planilla?
                <span className="block text-brand-300">Activá tu robot de RH y olvidate de las carreras.</span>
              </h1>

              <p className="text-lg text-brand-200/90">
                Generá planilla en 5 minutos, con IHSS, RAP e ISR listos y vouchers enviados por Mail/WhatsApp.
              </p>

              <ul className="text-brand-200/80 space-y-2">
                <li className="flex items-start gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mt-2" /> Cumplimiento STSS desde el día uno.</li>
                <li className="flex items-start gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mt-2" /> De Excel caótico a PDF impecable en minutos.</li>
                <li className="flex items-start gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mt-2" /> Ahorro de 6 horas por quincena.</li>
              </ul>

              <div className="flex justify-start">
                <button
                  onClick={() => window.location.href = '/activar'}
                  className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-semibold shadow-sm bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1"
                  data-analytics="cta_hero_click"
                >
                  Activar GRATIS hoy
                </button>
              </div>

              {/* Features como texto simple, no como badges confusos */}
              <div className="text-sm text-brand-200/60 space-y-1">
                <p>✓ Vouchers por WhatsApp • ✓ IHSS, RAP, ISR automáticos • ✓ Cumplimiento STSS desde el día 1</p>
              </div>
            </div>

            {/* Carrusel de imágenes del sistema */}
            <div className="relative">
              <ImageCarousel />
            </div>
          </div>
          
          {/* Frase de urgencia al final del componente */}
          <div className="text-center mt-12">
            <p className="text-xl font-semibold text-brand-200/90">
              Próxima planilla: {nextPayday.toLocaleDateString()}. ¿Otra vez la vas a hacer desde cero?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
