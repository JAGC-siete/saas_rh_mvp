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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-strong rounded-3xl p-6 lg:p-8 backdrop-blur-sm border border-white/20 shadow-2xl">
          {/* Solo el carrusel de imágenes del sistema */}
          <div className="relative">
            <ImageCarousel />
          </div>
        </div>
      </div>
    </div>
  );
}
