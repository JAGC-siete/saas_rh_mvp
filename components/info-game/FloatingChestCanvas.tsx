import { useCallback, useEffect, useRef } from 'react'
import {
  CHEST_FRAME_COUNT,
  CHEST_FRAME_H,
  CHEST_FRAME_W,
  useChestSprite,
} from './useChestSprite'

type FloatingChestCanvasProps = {
  onReady?: () => void
  onError?: () => void
}

type Particle = {
  x: number
  y: number
  radius: number
  phase: number
  speed: number
}

const PARTICLE_COUNT = 7

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: 0.15 + Math.random() * 0.7,
    y: 0.1 + Math.random() * 0.55,
    radius: 1.2 + Math.random() * 2,
    phase: (i / PARTICLE_COUNT) * Math.PI * 2,
    speed: 0.8 + Math.random() * 0.6,
  }))
}

export default function FloatingChestCanvas({ onReady, onError }: FloatingChestCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>(createParticles())
  const readyFiredRef = useRef(false)
  const openingRef = useRef(false)

  const { ready, chest, glow, setSequence, tick, getGlowFrame } = useChestSprite()

  const triggerOpen = useCallback(() => {
    if (openingRef.current) return
    openingRef.current = true
    setSequence('open')
    setTimeout(() => {
      openingRef.current = false
    }, CHEST_FRAME_COUNT * 65 + 100)
  }, [setSequence])

  useEffect(() => {
    if (!ready) return

    const container = containerRef.current
    const canvas = canvasRef.current
    const chestImg = chest.current
    const glowImg = glow.current
    if (!container || !canvas || !chestImg || !glowImg) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!readyFiredRef.current) {
      readyFiredRef.current = true
      onReady?.()
    }

    let running = true

    const draw = (now: number) => {
      if (!running) return

      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const dpr = window.devicePixelRatio || 1
      const pw = Math.round(w * dpr)
      const ph = Math.round(h * dpr)

      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const frame = tick(now)
      const glowFrame = getGlowFrame(now)
      const floatY = Math.sin(now * 0.002) * 6
      const sway = Math.sin(now * 0.0015) * 0.009
      const drawSize = Math.min(w, h) * 0.88
      const cx = w / 2
      const cy = h / 2 + floatY

      // Golden particles
      for (const p of particlesRef.current) {
        const px = p.x * w + Math.sin(now * 0.001 * p.speed + p.phase) * 4
        const py = p.y * h + Math.cos(now * 0.0012 * p.speed + p.phase) * 3
        const alpha = 0.25 + Math.sin(now * 0.002 * p.speed + p.phase) * 0.35
        ctx.beginPath()
        ctx.arc(px, py, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`
        ctx.fill()
      }

      // Chest sprite
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(sway)
      ctx.drawImage(
        chestImg,
        frame * CHEST_FRAME_W,
        0,
        CHEST_FRAME_W,
        CHEST_FRAME_H,
        -drawSize / 2,
        -drawSize / 2,
        drawSize,
        drawSize,
      )

      // Glow overlay beneath chest interior
      const glowAlpha = 0.35 + Math.sin(now * 0.0012) * 0.2
      ctx.globalAlpha = glowAlpha
      const glowH = drawSize * 0.35
      const glowY = drawSize * 0.12
      ctx.drawImage(
        glowImg,
        glowFrame * CHEST_FRAME_W,
        0,
        CHEST_FRAME_W,
        CHEST_FRAME_H,
        -drawSize / 2,
        glowY,
        drawSize,
        glowH,
      )
      ctx.restore()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [ready, chest, glow, tick, getGlowFrame, onReady])

  useEffect(() => {
    if (!ready) {
      const timer = setTimeout(() => {
        if (!readyFiredRef.current) onError?.()
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [ready, onError])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onPointerEnter={triggerOpen}
      onClick={triggerOpen}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Cofre secreto con método exclusivo"
        className="relative z-10 h-full w-full"
      />
    </div>
  )
}
