'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Benefit {
  id: string
  title: string
  subtitle: string
  description: string
  cta: string
}

const benefits: Benefit[] = [
  {
    id: 'cero-errores',
    title: 'Cero errores',
    subtitle: '0 errores. 0 dramas. 0 pasivo laboral.',
    description: 'Haz la planilla como un robot: precisa, puntual y sin estrés.',
    cta: 'Actívalo hoy.'
  },
  {
    id: 'cumplimiento-legal',
    title: 'Cumplimiento legal garantizado',
    subtitle: 'IHSS, RAP e ISR calculados al centavo.',
    description: 'Evita multas, reclamos y auditorías.',
    cta: 'Tu planilla, siempre en regla.'
  },
  {
    id: 'tranquilidad',
    title: 'Tranquilidad total',
    subtitle: 'Adiós a las madrugadas corrigiendo planillas.',
    description: 'Descansa sabiendo que todo está correcto y entregado a tiempo.',
    cta: 'Automatízalo ya.'
  },
  {
    id: 'control-transparencia',
    title: 'Control y transparencia',
    subtitle: 'Historial claro y vouchers individuales para cada empleado.',
    description: 'Confianza interna y cero discusiones.',
    cta: 'Actívalo ahora.'
  },
  {
    id: 'todo-en-clic',
    title: 'Todo en un clic',
    subtitle: 'Genera planilla y vouchers en segundos.',
    description: 'Sin plantillas, sin copiar y pegar, sin margen de error.',
    cta: 'Pruébalo gratis.'
  }
]

export default function BenefitsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Page visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Auto-play logic
  useEffect(() => {
    if (reducedMotion || isPaused || !isPageVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % benefits.length)
    }, 4000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [reducedMotion, isPaused, isPageVisible])

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % benefits.length)
    } else if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + benefits.length) % benefits.length)
    }
  }, [])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + benefits.length) % benefits.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % benefits.length)
  }

  return (
    <div 
      className="relative w-full max-w-4xl mx-auto px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main carousel container */}
      <div 
        ref={carouselRef}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8 md:p-12 shadow-2xl border-4 border-red-500"
        role="region"
        aria-label="Beneficios del SaaS"
        aria-live="polite"
        style={{ zIndex: 1000 }}
      >
        {/* Current benefit */}
        <div 
          className="text-center transition-all duration-700 ease-in-out"
          style={{
            transform: reducedMotion ? 'none' : `translateX(-${currentIndex * 100}%)`
          }}
        >
          <div className="mb-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {benefits[currentIndex].title}
            </h2>
            <p className="text-xl md:text-2xl text-blue-200 font-semibold mb-4">
              {benefits[currentIndex].subtitle}
            </p>
            <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
              {benefits[currentIndex].description}
            </p>
            <p className="text-xl md:text-2xl font-bold text-blue-400">
              {benefits[currentIndex].cta}
            </p>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Beneficio anterior"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Siguiente beneficio"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>

        {/* Progress bar */}
        {!reducedMotion && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / benefits.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center mt-6 space-x-2" role="tablist" aria-label="Navegación de beneficios">
        {benefits.map((benefit, index) => (
          <button
            key={benefit.id}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
              index === currentIndex 
                ? 'bg-blue-400 scale-110' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
            role="tab"
            aria-selected={index === currentIndex}
            aria-label={`Ir al beneficio ${index + 1}: ${benefit.title}`}
          />
        ))}
      </div>

      {/* Keyboard navigation instructions for screen readers */}
      <div className="sr-only">
        <p>Usa las flechas izquierda y derecha para navegar entre los beneficios, o presiona Enter para activar un botón.</p>
      </div>
    </div>
  )
}
