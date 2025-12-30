import React from "react";
import ImageCarousel from "./ImageCarousel";
import { nowInHonduras } from '../lib/timezone'

export default function LandingHero() {
  // Función simple para obtener la próxima quincena
  const getNextPayday = () => {
    const now = nowInHonduras();
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
       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12 lg:py-20">
         <div className="glass-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
           <div className="text-center space-y-8">
             {/* Carrusel de imágenes del sistema - Centrado */}
             {/* <div className="relative max-w-4xl mx-auto">
               <ImageCarousel />
             </div> */}

             {/* Información debajo del carrusel */}
             <div className="space-y-4 sm:space-y-6">
               <p className="text-base sm:text-lg md:text-xl text-brand-200/90 px-2 max-w-3xl mx-auto">
                 El sistema que registra entradas y salidas, calcula IHSS, RAP e ISR, y genera tu planilla y comprobantes sin Excel, sin errores y sin perder tu domingo.
               </p>

               {/* CTA único */}
               <div className="space-y-3 sm:space-y-4 pt-4">
                 <button
                   onClick={() => window.location.href = '/activar'}
                   className="inline-flex items-center justify-center rounded-xl px-8 sm:px-10 py-3 sm:py-4 text-lg sm:text-xl font-bold shadow-lg bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1 whitespace-nowrap"
                   data-analytics="cta_hero_click"
                 >
                   Activar ahora — Prueba gratis 30 días
                 </button>
                 
                 {/* Features text below CTA */}
                 <div className="text-xs sm:text-sm text-brand-200/60 px-2">
                   <p>Sin tarjeta. Sin compromiso. Empleados ilimitados.</p>
                 </div>
               </div>
             </div>
           </div>
          
          {/* Frase de urgencia al final del componente */}
          <div className="text-center mt-8 sm:mt-10 md:mt-12 px-2">
            <p className="text-base sm:text-lg md:text-xl font-semibold text-brand-200/90">
              Próxima planilla: {nextPayday.toLocaleDateString()}. ¿Otra vez la vas a hacer desde cero?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
