import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface CarouselImage {
  src: string;
  alt: string;
  title: string;
  description: string;
}

const carouselImages: CarouselImage[] = [
  {
    src: '/1.png',
    alt: 'Sistema de Recursos Humanos - Vista 1',
    title: 'Sistema de RH',
    description: 'Gestión completa de empleados y asistencia'
  },
  {
    src: '/2.png',
    alt: 'Sistema de Recursos Humanos - Vista 2',
    title: 'Dashboard Principal',
    description: 'Panel de control con métricas clave'
  },
  {
    src: '/3.png',
    alt: 'Sistema de Recursos Humanos - Vista 3',
    title: 'Gestión de Asistencia',
    description: 'Control de checadas y reportes en tiempo real'
  },
  {
    src: '/4.png',
    alt: 'Sistema de Recursos Humanos - Vista 4',
    title: 'Reportes y Analytics',
    description: 'Análisis completo de datos de RH'
  },
  {
    src: '/voucher-sample.png',
    alt: 'Voucher de pago generado automáticamente',
    title: 'Voucher Automático',
    description: 'PDF perfecto con IHSS, RAP, ISR listos para envío'
  }
];

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? carouselImages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Imagen principal */}
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white/80 backdrop-blur shadow-xl border border-white/20">
        <Image
          src={carouselImages[currentIndex].src}
          alt={carouselImages[currentIndex].alt}
          fill
          className="object-cover transition-all duration-500 ease-in-out"
          priority
        />
        
        {/* Overlay con información */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          <h3 className="text-white font-bold text-lg mb-1">
            {carouselImages[currentIndex].title}
          </h3>
          <p className="text-white/90 text-sm">
            {carouselImages[currentIndex].description}
          </p>
        </div>
      </div>

      {/* Controles de navegación */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 text-white transition-all duration-300 hover:scale-110"
        aria-label="Imagen anterior"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 text-white transition-all duration-300 hover:scale-110"
        aria-label="Siguiente imagen"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Indicadores */}
      <div className="flex justify-center mt-4 space-x-2">
        {carouselImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-sky-500 scale-125' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Ir a imagen ${index + 1}`}
          />
        ))}
      </div>

      {/* Contador de tiempo */}
      <div className="text-center mt-2">
        <span className="text-xs text-brand-200/70">
          Imágenes con fines ilustrativos
        </span>
      </div>
    </div>
  );
}
