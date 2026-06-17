import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CursorSpotlight() {
  const [enabled, setEnabled] = useState(false)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 })

  useEffect(() => {
    const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const mqMotion = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const update = () => setEnabled(mqFine.matches && mqMotion.matches)
    update()
    mqFine.addEventListener('change', update)
    mqMotion.addEventListener('change', update)
    return () => {
      mqFine.removeEventListener('change', update)
      mqMotion.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [enabled, mouseX, mouseY])

  if (!enabled) return null

  return (
    <motion.div
      className="fixed pointer-events-none z-[1] rounded-full bg-brand-500/10 blur-3xl"
      style={{
        x: springX,
        y: springY,
        width: 400,
        height: 400,
        translateX: '-50%',
        translateY: '-50%',
      }}
      aria-hidden
    />
  )
}
