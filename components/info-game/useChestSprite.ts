import { useCallback, useEffect, useRef, useState } from 'react'

export const CHEST_SPRITE_SRC = '/images/secreto-chest/chest-sprite-sheet.webp'
export const CHEST_GLOW_SRC = '/images/secreto-chest/chest-glow.webp'

export const CHEST_FRAME_W = 256
export const CHEST_FRAME_H = 256
export const CHEST_FRAME_COUNT = 8
export const GLOW_FRAME_COUNT = 4

export type ChestSequence = 'idle' | 'open'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}

export function useChestSprite() {
  const [ready, setReady] = useState(false)
  const chestRef = useRef<HTMLImageElement | null>(null)
  const glowRef = useRef<HTMLImageElement | null>(null)
  const sequenceRef = useRef<ChestSequence>('idle')
  const frameRef = useRef(0)
  const openStartRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([loadImage(CHEST_SPRITE_SRC), loadImage(CHEST_GLOW_SRC)])
      .then(([chest, glow]) => {
        if (cancelled) return
        chestRef.current = chest
        glowRef.current = glow
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const setSequence = useCallback((seq: ChestSequence) => {
    sequenceRef.current = seq
    if (seq === 'open') {
      frameRef.current = 0
      openStartRef.current = null
    } else {
      frameRef.current = 0
      openStartRef.current = null
    }
  }, [])

  const tick = useCallback((now: number): number => {
    if (sequenceRef.current === 'open') {
      if (openStartRef.current === null) openStartRef.current = now
      const elapsed = now - openStartRef.current
      const frame = Math.min(
        CHEST_FRAME_COUNT - 1,
        Math.floor(elapsed / 65),
      )
      frameRef.current = frame
      if (frame >= CHEST_FRAME_COUNT - 1) {
        sequenceRef.current = 'idle'
      }
    }
    return frameRef.current
  }, [])

  const getGlowFrame = useCallback((now: number): number => {
    return Math.floor((now * 0.003) % GLOW_FRAME_COUNT)
  }, [])

  return {
    ready,
    chest: chestRef,
    glow: glowRef,
    frame: frameRef,
    sequence: sequenceRef,
    setSequence,
    tick,
    getGlowFrame,
  }
}
