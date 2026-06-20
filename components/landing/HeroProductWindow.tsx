import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import ProgressIndicator from './ProgressIndicator'

const SLIDE_DURATION_MS = 5000

const carouselImages = [
  {
    src: '/1.png',
    alt: 'Registro Inteligente de Asistencia',
    title: 'Registro Inteligente de Asistencia',
    description: 'Control automático de checadas con antifraude y justificación inteligente',
  },
  {
    src: '/2.png',
    alt: 'Empleados ganan puntos por asistencia',
    title: 'Gamificación de Asistencia',
    description: 'Sistema de puntos y recompensas por cumplimiento y puntualidad',
  },
  {
    src: '/3.png',
    alt: 'Las planillas hechas inmediatamente',
    title: 'Planillas Automáticas',
    description: 'Generación instantánea de planillas con IHSS, RAP, ISR calculados automáticamente',
  },
  {
    src: '/4.png',
    alt: 'Vouchers de pago automáticos y personalizados',
    title: 'Vouchers Automáticos',
    description: 'PDFs personalizados con datos del empleado, enviados por email/WhatsApp',
  },
  {
    src: '/5.png',
    alt: 'Dispositivo biométrico Hikvision - Vista frontal',
    title: 'Dispositivo Biométrico Hikvision',
    description: 'Terminal de reconocimiento facial con tecnología avanzada para registro preciso de asistencia',
  },
  {
    src: '/6.png',
    alt: 'Dispositivo biométrico Hikvision - Vista posterior',
    title: 'Hardware Profesional',
    description: 'Equipo certificado y robusto para control de acceso y asistencia en tiempo real',
  },
]

export default function HeroProductWindow() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [parallaxEnabled, setParallaxEnabled] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 })
  const translateX = useTransform(springX, [-0.5, 0.5], [-8, 8])
  const translateY = useTransform(springY, [-0.5, 0.5], [-8, 8])

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setParallaxEnabled(mq.matches)
    const handler = () => setParallaxEnabled(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const advanceSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1))
    setProgress(0)
  }, [])

  useEffect(() => {
    const tick = 50
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (tick / SLIDE_DURATION_MS) * 100
        if (next >= 100) {
          advanceSlide()
          return 0
        }
        return next
      })
    }, tick)
    return () => clearInterval(interval)
  }, [currentIndex, advanceSlide])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!parallaxEnabled || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setProgress(0)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1))
    setProgress(0)
  }

  const goToNext = () => {
    advanceSlide()
  }

  const slide = carouselImages[currentIndex]

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={parallaxEnabled ? { x: translateX, y: translateY } : undefined}
        className="glass-modern rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
      >
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-900/50 border border-white/5">
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover transition-opacity duration-500"
            priority={currentIndex === 0}
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
            sizes="(max-width: 1024px) 100vw, 35vw"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-0.5">{slide.title}</h3>
            <p className="text-slate-400 text-xs sm:text-sm line-clamp-2">{slide.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 px-1">
          <button
            type="button"
            onClick={goToPrevious}
            className="shrink-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Imagen anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <ProgressIndicator progress={progress} className="flex-1" />
          <button
            type="button"
            onClick={goToNext}
            className="shrink-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Siguiente imagen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 mt-2 px-1">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`flex-1 h-1 rounded-full transition-colors ${
                index === currentIndex ? 'bg-brand-400' : 'bg-white/20 hover:bg-white/30'
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      </motion.div>

      <p className="text-center mt-3 text-xs text-slate-400 font-medium">
        Así se ve la planilla hecha en 4 minutos con nuestro sistema
      </p>
    </div>
  )
}
