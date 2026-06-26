import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  body: string
  children: React.ReactNode
}

export default function LeadCaptureSoftGate({ open, onClose, title, body, children }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soft-gate-title"
    >
      <div className="glass-modern rounded-2xl border border-white/20 shadow-2xl max-w-md w-full p-6 relative animate-fade-up-subtle">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-brand-300 hover:text-white p-1"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <h2 id="soft-gate-title" className="text-xl font-bold text-white pr-8 mb-2">
          {title}
        </h2>
        <p className="text-sm text-brand-200/90 mb-4">{body}</p>
        {children}
      </div>
    </div>
  )
}

/** Dispara soft-gate tras delay y en exit-intent (desktop). */
export function useLeadSoftGateTriggers(enabled: boolean, delayMs = 5000) {
  const [shouldPrompt, setShouldPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!enabled || dismissed) return
    const t = setTimeout(() => setShouldPrompt(true), delayMs)
    return () => clearTimeout(t)
  }, [enabled, dismissed, delayMs])

  useEffect(() => {
    if (!enabled || dismissed) return

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) setShouldPrompt(true)
    }
    document.addEventListener('mouseout', onLeave)
    return () => document.removeEventListener('mouseout', onLeave)
  }, [enabled, dismissed])

  return {
    showSoftGate: shouldPrompt && !dismissed,
    dismissSoftGate: () => {
      setDismissed(true)
      setShouldPrompt(false)
    },
  }
}
