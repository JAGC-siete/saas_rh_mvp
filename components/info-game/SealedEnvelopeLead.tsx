import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PeaceLeadWizard, { type PeaceLeadWizardHandle } from './PeaceLeadWizard'
import { SEALED_ENVELOPE_COPY } from '../../lib/info-game/sealed-envelope-copy'

const copy = SEALED_ENVELOPE_COPY

export default function SealedEnvelopeLead() {
  const router = useRouter()
  const wizardRef = useRef<PeaceLeadWizardHandle>(null)
  const autoUnlockDone = useRef(false)
  const [showHero, setShowHero] = useState(true)

  useEffect(() => {
    if (!router.isReady) return
    if (router.query.unlock === '1') setShowHero(false)
  }, [router.isReady, router.query.unlock])

  useEffect(() => {
    if (!router.isReady || autoUnlockDone.current || router.query.unlock !== '1') return
    autoUnlockDone.current = true
    wizardRef.current?.startUnlock()
    requestAnimationFrame(() => {
      document.getElementById('info-lead')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [router.isReady, router.query.unlock])

  const openWizard = () => {
    setShowHero(false)
    wizardRef.current?.startUnlock()
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showHero && (
          <motion.section
            key="intrigue"
            className="viernes-section pt-8 sm:pt-12 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <span className="viernes-badge">{copy.badge}</span>
            <h1 className="viernes-serif mb-6 max-w-4xl mx-auto">
              <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-normal not-italic leading-tight text-white">
                {copy.intrigue.headlineLead}
              </span>
            </h1>
            <p className="viernes-lead mb-6 max-w-2xl mx-auto">{copy.intrigue.subheadline}</p>
            <p className="viernes-mantra mb-8 max-w-xl mx-auto text-left">{copy.intrigue.headlineAccent}</p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
              <button type="button" onClick={openWizard} className="viernes-btn viernes-btn-primary">
                {copy.intrigue.cta}
              </button>
              <Link
                href="/calculadora?utm_source=info&utm_medium=hero&utm_campaign=validar-calculo"
                className="viernes-btn viernes-btn-ghost text-sm"
              >
                {copy.intrigue.ctaSecondary}
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <PeaceLeadWizard ref={wizardRef} channel="info" idPrefix="info" />
    </>
  )
}
