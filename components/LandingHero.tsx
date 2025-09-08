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
       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
         <div className="glass-strong rounded-3xl p-8 lg:p-12 backdrop-blur-sm border border-white/20 shadow-2xl">
           <div className="text-center space-y-8">
             {/* Carrusel de imágenes del sistema - Centrado */}
             <div className="relative max-w-4xl mx-auto">
               <ImageCarousel />
             </div>

             {/* Información debajo del carrusel */}
             <div className="space-y-6">
               <p className="text-lg text-brand-200/90">
                 Generá planilla en 5 minutos, con IHSS, RAP e ISR listos y vouchers enviados por Mail/WhatsApp.
               </p>

               <ul className="text-brand-200/80 space-y-2 max-w-md mx-auto">
                 <li className="flex items-center gap-2">
                   <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                   Cumplimiento STSS desde el día uno.
                 </li>
                 <li className="flex items-center gap-2">
                   <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                   De Excel caótico a PDF impecable en minutos.
                 </li>
                 <li className="flex items-center gap-2">
                   <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                   Ahorro de 6 horas por quincena.
                 </li>
               </ul>

               {/* Email CTA Section */}
               <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                   <input
                     type="email"
                     placeholder="Tu email"
                     className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                   />
                   <button
                     onClick={() => window.location.href = '/activar'}
                     className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-lg font-semibold shadow-sm bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-1 whitespace-nowrap"
                     data-analytics="cta_hero_click"
                   >
                     Probalo HOY
                   </button>
                 </div>
                 
                 {/* Features text below CTA */}
                 <div className="text-sm text-brand-200/60">
                   <p>Usalo gratis 30 días. Empleados ilimitados.</p>
                 </div>
               </div>
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
