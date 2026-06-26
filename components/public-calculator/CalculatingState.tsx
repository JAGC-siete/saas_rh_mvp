import { useEffect, useRef, useState } from 'react'
import { CalcStepMarker } from './CalculatorUiIcons'

type Props = {
  steps: string[]
  durationMs?: number
  onComplete: () => void
}

export default function CalculatingState({ steps, durationMs = 1500, onComplete }: Props) {
  const [visibleCount, setVisibleCount] = useState(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const stepInterval = durationMs / Math.max(steps.length, 1)
    let i = 0
    const tick = setInterval(() => {
      i += 1
      setVisibleCount(i)
      if (i >= steps.length) clearInterval(tick)
    }, stepInterval)

    const done = setTimeout(() => onCompleteRef.current(), durationMs)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
  }, [steps, durationMs])

  return (
    <div className="py-12 px-4 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-600/30 border border-brand-500/50 mb-6 animate-pulse">
        <svg className="w-7 h-7 text-brand-300 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <p className="text-white font-semibold mb-4">Validando con motor legal Humano SISU…</p>
      <ul className="space-y-2 text-sm text-left max-w-xs mx-auto">
        {steps.map((step, idx) => (
          <li
            key={step}
            className={`flex items-center gap-2 transition-opacity duration-300 ${
              idx < visibleCount ? 'opacity-100 text-green-300' : 'opacity-30 text-brand-300'
            }`}
          >
            <CalcStepMarker done={idx < visibleCount} />
            {step}
          </li>
        ))}
      </ul>
    </div>
  )
}
