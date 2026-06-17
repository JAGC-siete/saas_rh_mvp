import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircleIcon, ClockIcon, CurrencyDollarIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import CountdownTimer from '../CountdownTimer'
import { GUIDE_LINKS } from '../../lib/seo/internal-links'
import BorderBeam from './BorderBeam'
import ScrollReveal from './ScrollReveal'

const FLAGS = [
  { code: 'HN', label: 'Honduras', emoji: '🇭🇳' },
  { code: 'SV', label: 'El Salvador', emoji: '🇸🇻' },
  { code: 'GT', label: 'Guatemala', emoji: '🇬🇹' },
]

function ErrorCounter() {
  const [value, setValue] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 2000

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * 12))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setValue(0)
        setDone(true)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="mt-4 p-4 rounded-xl bg-slate-950/40 border border-white/5">
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Errores detectados</div>
      <div className={`text-3xl font-bold tabular-nums ${done ? 'text-cyan-400' : 'text-white'}`}>
        {done ? '0' : value}
      </div>
      {done && (
        <p className="text-xs text-cyan-400/80 mt-1 font-medium">Nómina validada al centavo</p>
      )}
    </div>
  )
}

function FlagsCarousel() {
  const items = [...FLAGS, ...FLAGS, ...FLAGS]
  return (
    <div className="overflow-hidden mt-3">
      <div className="flags-marquee">
        {items.map((flag, i) => (
          <span key={`${flag.code}-${i}`} className="inline-flex items-center gap-2 text-slate-400 text-sm whitespace-nowrap">
            <span className="text-lg">{flag.emoji}</span>
            {flag.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function BentoServicesGrid() {
  return (
    <section id="servicios" className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <ScrollReveal>
        <header className="max-w-3xl mb-8 sm:mb-10 mx-auto text-center px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            <span className="text-white block sm:inline">Tu nuevo ecosistema de RRHH:</span>
            <span className="text-brand-300 block sm:inline mt-1 sm:mt-0">diseñado para escalar sin burocracia.</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 px-2 font-medium landing-dark-text">
            Dejá de contratar personal solo para pasar datos. Centralizá tu operación con tecnología y{' '}
            <span className="text-brand-400">trazabilidad</span>.
          </p>
        </header>
      </ScrollReveal>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
        {/* Nómina — large card */}
        <ScrollReveal delay={0.05} className="col-span-2 lg:col-span-2 lg:row-span-2">
          <BorderBeam className="h-full">
            <article id="planillero" className="glass-modern rounded-2xl p-5 sm:p-6 h-full hover:scale-[1.01] transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-white/5 border border-white/10">
                  <CurrencyDollarIcon className="h-5 w-5 text-brand-300" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Nómina &ldquo;Cero Errores&rdquo;</h3>
                  <p className="text-xs text-slate-400">Ley local + vouchers PDF</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2"><CheckCircleIcon className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />Cálculos 100% parametrizados (IHSS, RAP, ISR, INFOP)</li>
                <li className="flex gap-2"><CheckCircleIcon className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />Gestión de horas extra y prestaciones</li>
                <li className="flex gap-2"><CheckCircleIcon className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />Vouchers PDF masivos automatizados</li>
              </ul>
              <ErrorCounter />
              <Link href={GUIDE_LINKS.deduccionesHonduras.href} className="inline-flex items-center gap-1 mt-4 text-xs text-brand-300 hover:text-white transition-colors">
                Guía IHSS, RAP e ISR <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </article>
          </BorderBeam>
        </ScrollReveal>

        {/* Biometría — medium */}
        <ScrollReveal delay={0.1} className="col-span-2 lg:col-span-2">
          <BorderBeam className="h-full">
            <article id="libro-rojo" className="glass-modern rounded-2xl p-5 sm:p-6 h-full relative overflow-hidden hover:scale-[1.01] transition-transform duration-300">
              <div className="radar-pulse" aria-hidden />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 grid place-items-center rounded-xl bg-white/5 border border-white/10">
                    <ClockIcon className="h-5 w-5 text-brand-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Control Biométrico</h3>
                    <p className="text-xs text-slate-400">Asistencia en tiempo real</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm text-slate-400">
                  <li className="flex gap-2"><CheckCircleIcon className="h-4 w-4 text-brand-400 shrink-0" />Registro exacto y antifraude</li>
                  <li className="flex gap-2"><CheckCircleIcon className="h-4 w-4 text-brand-400 shrink-0" />Alertas de tardanza para gerencia</li>
                </ul>
                <Link href={GUIDE_LINKS.biometricoNomina.href} className="inline-flex items-center gap-1 mt-3 text-xs text-brand-300 hover:text-white transition-colors">
                  Biometría + planilla <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </article>
          </BorderBeam>
        </ScrollReveal>

        {/* Leyes CA — small */}
        <ScrollReveal delay={0.15} className="col-span-1">
          <BorderBeam className="h-full">
            <article className="glass-modern rounded-2xl p-4 sm:p-5 h-full hover:scale-[1.01] transition-transform duration-300 overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-1">Leyes CA</h3>
              <p className="text-xs text-slate-400">IHSS · RAP · ISR</p>
              <FlagsCarousel />
            </article>
          </BorderBeam>
        </ScrollReveal>

        {/* Trazabilidad — small */}
        <ScrollReveal delay={0.2} className="col-span-1">
          <BorderBeam className="h-full">
            <article className="glass-modern rounded-2xl p-4 sm:p-5 h-full hover:scale-[1.01] transition-transform duration-300">
              <h3 className="text-sm font-bold text-white mb-1">Trazabilidad</h3>
              <p className="text-xs text-slate-400 mb-3">Auditoría y cumplimiento</p>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li className="flex gap-1.5"><CheckCircleIcon className="h-3.5 w-3.5 text-brand-400 shrink-0" />Auditoría completa</li>
                <li className="flex gap-1.5"><CheckCircleIcon className="h-3.5 w-3.5 text-brand-400 shrink-0" />Docs listos para revisión</li>
              </ul>
            </article>
          </BorderBeam>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={0.25}>
        <CountdownTimer />
      </ScrollReveal>
    </section>
  )
}
