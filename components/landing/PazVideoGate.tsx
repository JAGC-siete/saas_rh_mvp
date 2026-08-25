import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { trackCTAClick } from '../../lib/analytics/googleAds'
import {
  PAZ_UNLOCK_QUERY,
  PAZ_UNLOCK_STORAGE_KEY,
  PAZ_YOUTUBE_EMBED_SRC,
} from '../../lib/marketing/paz-video'

type GateStatus = 'idle' | 'submitting' | 'error'

function readStoredUnlock(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(PAZ_UNLOCK_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persistUnlock(): void {
  try {
    window.sessionStorage.setItem(PAZ_UNLOCK_STORAGE_KEY, '1')
  } catch {
    // private mode / quota
  }
}

export default function PazVideoGate() {
  const router = useRouter()
  const [unlocked, setUnlocked] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<GateStatus>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    const queryUnlock = router.query[PAZ_UNLOCK_QUERY]
    const fromQuery = queryUnlock === '1' || (Array.isArray(queryUnlock) && queryUnlock[0] === '1')
    if (fromQuery || readStoredUnlock()) {
      persistUnlock()
      setUnlocked(true)
    }
  }, [router.isReady, router.query])

  const unlock = (note?: string) => {
    persistUnlock()
    setUnlocked(true)
    if (note) setMessage(note)
    requestAnimationFrame(() => {
      document.getElementById('paz-video')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setMessage('')
    trackCTAClick('paz_video_gate', 'paz_video_form')

    try {
      const res = await fetch('/api/paz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await res.json()) as {
        success?: boolean
        error?: string
        data?: { message?: string; unlocked?: boolean }
      }
      if (!res.ok || payload.success === false) {
        setStatus('error')
        setMessage(payload.error || 'No pudimos revelar el video. Probá de nuevo.')
        return
      }
      setStatus('idle')
      unlock(payload.data?.message)
    } catch {
      setStatus('error')
      setMessage('No pudimos revelar el video. Probá de nuevo.')
    }
  }

  return (
    <>
      <div className="paz-video-frame">
        {unlocked ? (
          <iframe
            className="paz-video-embed"
            src={PAZ_YOUTUBE_EMBED_SRC}
            title="Método revelado — Humano SISU"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="paz-video-teaser">
            <p className="paz-serif paz-video-teaser-title">El método está acá.</p>
            <p className="paz-video-teaser-lead">Dejá tu correo y lo revelamos — en esta página y en tu bandeja.</p>
          </div>
        )}
      </div>

      {!unlocked ? (
        <form className="paz-gate" onSubmit={onSubmit} id="paz-video-form">
          <label htmlFor="paz-email" className="paz-gate-label">
            Correo para revelar el video
          </label>
          <div className="paz-gate-row">
            <input
              id="paz-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="nina.v@example.com"
              className="paz-gate-input"
              disabled={status === 'submitting'}
            />
            <button
              type="submit"
              className="paz-btn paz-btn-primary"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Revelando…' : 'Revelar el video'}
            </button>
          </div>
          {message ? (
            <p className={`paz-gate-msg ${status === 'error' ? 'is-error' : ''}`} role="status">
              {message}
            </p>
          ) : (
            <p className="paz-gate-hint">
              Te escribimos desde humanosisu@humanosisu.net. El video queda acá apenas confirmamos el correo.
            </p>
          )}
        </form>
      ) : (
        <p className="paz-gate-hint paz-gate-unlocked" role="status">
          {message || 'Dale play. También te mandamos el enlace al correo por si querés volver.'}
        </p>
      )}
    </>
  )
}
