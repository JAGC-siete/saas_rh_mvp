import { FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { LockClosedIcon, PlayIcon } from '@heroicons/react/24/solid'
import { trackCTAClick } from '../../lib/analytics/googleAds'
import {
  PAZ_METHOD_SUMMARY_LEAD,
  PAZ_METHOD_SUMMARY_POINTS,
  PAZ_METHOD_SUMMARY_TITLE,
  PAZ_UNLOCK_QUERY,
  PAZ_UNLOCK_STORAGE_KEY,
  PAZ_YOUTUBE_EMBED_SRC,
} from '../../lib/marketing/paz-video'
import { TRUST_CLIENT_NAMES } from './TrustBar'

type GateStatus = 'idle' | 'submitting' | 'error'

const PAZ_TRUST_NAMES = TRUST_CLIENT_NAMES.slice(0, 6)
const REVEAL_MS = 480

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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
  const [showTeaser, setShowTeaser] = useState(true)
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
      setShowTeaser(false)
    }
  }, [router.isReady, router.query])

  const unlock = (note?: string) => {
    persistUnlock()
    setUnlocked(true)
    if (note) setMessage(note)
    if (prefersReducedMotion()) {
      setShowTeaser(false)
      return
    }
    window.setTimeout(() => {
      setShowTeaser(false)
      document.getElementById('paz-video')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, REVEAL_MS)
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

  const focusEmail = () => {
    document.getElementById('paz-email')?.focus()
  }

  const frameClass = [
    'paz-video-frame',
    showTeaser && !unlocked ? 'is-gated' : '',
    unlocked && showTeaser ? 'is-revealing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={frameClass}>
        {unlocked ? (
          <iframe
            className="paz-video-embed"
            src={PAZ_YOUTUBE_EMBED_SRC}
            title="Método revelado — Humano SISU"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : null}
        {showTeaser ? (
          <div className="paz-video-teaser">
            <div className="paz-video-poster-wrap" aria-hidden>
              <Image
                src="/images/paz/cta-stress.jpg"
                alt=""
                fill
                priority
                sizes="(max-width: 832px) calc(100vw - 3rem), 52rem"
                className="paz-video-poster paz-video-poster-stress"
                style={{ objectFit: 'cover', objectPosition: 'center 38%' }}
              />
              <Image
                src="/images/paz/cta-peace.jpg"
                alt=""
                fill
                sizes="(max-width: 832px) calc(100vw - 3rem), 52rem"
                className="paz-video-poster paz-video-poster-peace"
                style={{ objectFit: 'cover', objectPosition: 'center 38%' }}
              />
            </div>
            <div className="paz-video-teaser-scrim" aria-hidden />
            <div className="paz-video-teaser-body">
              <button
                type="button"
                className="paz-video-lock-play"
                onClick={focusEmail}
                aria-label="Ir al correo para desbloquear el video"
              >
                <PlayIcon className="paz-video-play-icon" aria-hidden />
                <span className="paz-video-lock-badge" aria-hidden>
                  <LockClosedIcon />
                </span>
              </button>
              <p className="paz-serif paz-video-teaser-title">El método está acá.</p>
              <p className="paz-video-teaser-lead">
                Dejá tu correo y lo revelamos — en esta página y en tu bandeja.
              </p>
              <form className="paz-gate paz-gate-inplayer" onSubmit={onSubmit} id="paz-video-form">
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
                    aria-busy={status === 'submitting'}
                  >
                    {status === 'submitting' ? (
                      <>
                        <span className="paz-btn-spinner" aria-hidden />
                        Revelando…
                      </>
                    ) : (
                      'Revelar el video'
                    )}
                  </button>
                </div>
                {message ? (
                  <p className={`paz-gate-msg ${status === 'error' ? 'is-error' : ''}`} role="status">
                    {message}
                  </p>
                ) : (
                  <p className="paz-gate-hint">
                    Te escribimos desde humanosisu@humanosisu.net. El video queda acá apenas confirmamos
                    el correo.
                  </p>
                )}
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <section className="paz-trust-strip" aria-label="Clientes que confían en Humano SISU">
        <p className="paz-trust-strip-title">Empresas que confían en nosotros</p>
        <ul className="paz-trust-strip-list">
          {PAZ_TRUST_NAMES.map((name) => (
            <li key={name} className="paz-trust-strip-item">
              {name}
            </li>
          ))}
        </ul>
      </section>

      {unlocked ? (
        <>
          <p className="paz-gate-hint paz-gate-unlocked" role="status">
            {message || 'Dale play. También te mandamos el enlace al correo por si querés volver.'}
          </p>
          <div className="paz-method-summary">
            <h3 className="paz-serif paz-method-summary-title">{PAZ_METHOD_SUMMARY_TITLE}</h3>
            <p className="paz-method-summary-lead">{PAZ_METHOD_SUMMARY_LEAD}</p>
            <ul className="paz-method-summary-list">
              {PAZ_METHOD_SUMMARY_POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </>
  )
}
