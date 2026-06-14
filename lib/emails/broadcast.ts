/**
 * Branded broadcast/communication email builder.
 * Follows the SISU dark "glass" landing style (same palette as
 * sisu-trial-access-html.ts): Montserrat, slate→indigo gradient, glass cards,
 * blue accents. Used by the super-admin Communication Center.
 */

const LANDING = {
  bgStart: '#0f172a',
  bgMid: '#1e3a8a',
  bgEnd: '#312e81',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  textMuted: '#bfdbfe',
  textSoft: '#93c5fd',
  glassBg: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.22)',
} as const

export interface BroadcastBlock {
  title: string
  description: string
}

export interface BuildBroadcastEmailInput {
  badge?: string
  title: string
  intro?: string
  blocks?: BroadcastBlock[]
  ctaUrl?: string
  ctaLabel?: string
  footerNote?: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Converts newlines to <br> after escaping. */
function escapeMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function styles(): string {
  const { bgStart, bgMid, bgEnd, primary, primaryHover, textMuted, textSoft, glassBg, glassBorder } = LANDING
  return `
    :root { color-scheme: dark; }
    body { margin: 0; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${bgStart}; color: #f8fafc; }
    .outer { width: 100%; padding: 32px 16px; background-color: ${bgStart};
      background-image:
        radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.06), transparent 60%),
        radial-gradient(1000px 500px at 80% 90%, rgba(255,255,255,0.04), transparent 60%),
        linear-gradient(160deg, ${bgStart}, ${bgMid} 50%, ${bgEnd}); }
    .card { max-width: 640px; margin: 0 auto; background: ${glassBg}; border-radius: 20px; border: 1px solid ${glassBorder}; box-shadow: 0 8px 30px rgba(0,0,0,0.20); overflow: hidden; }
    .hero { padding: 40px 40px 28px 40px; background: linear-gradient(160deg, rgba(30,58,138,0.55), rgba(49,46,129,0.35)); border-bottom: 1px solid ${glassBorder}; text-align: center; }
    .hero h1 { margin: 0; font-size: 26px; color: #ffffff; letter-spacing: -0.5px; font-weight: 700; }
    .hero p { margin: 12px 0 0 0; font-size: 15px; color: ${textMuted}; line-height: 1.55; }
    .badge { display: inline-block; margin-bottom: 18px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(59,130,246,0.18); color: ${textSoft}; border: 1px solid rgba(59,130,246,0.35); }
    .content { padding: 32px 40px 40px 40px; }
    .news { background: rgba(255,255,255,0.06); border: 1px solid ${glassBorder}; border-radius: 16px; padding: 18px 20px; }
    .news + .news { margin-top: 14px; }
    .news h4 { margin: 0 0 6px 0; font-size: 16px; color: #f8fafc; font-weight: 600; }
    .news p { margin: 0; font-size: 14px; color: ${textMuted}; line-height: 1.55; }
    .cta { text-align: center; margin: 32px 0 8px 0; }
    .cta a { display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; background: linear-gradient(135deg, ${primary}, ${primaryHover}); color: #ffffff; box-shadow: 0 4px 14px rgba(59,130,246,0.35); }
    .footer { text-align: center; padding: 28px 24px 36px 24px; font-size: 12px; color: ${textMuted}; opacity: 0.9; }
    .footer hr { border: 0; border-top: 1px solid ${glassBorder}; margin-bottom: 18px; }
    @media (max-width: 520px) { .hero, .content { padding: 24px; } .cta a { width: 100%; box-sizing: border-box; } }
  `
}

export function buildBroadcastEmailHtml(input: BuildBroadcastEmailInput): string {
  const { badge, title, intro, blocks = [], ctaUrl, ctaLabel, footerNote } = input

  const badgeHtml = badge ? `<div class="badge">${escapeHtml(badge)}</div>` : ''
  const introHtml = intro ? `<p>${escapeMultiline(intro)}</p>` : ''

  const blocksHtml = blocks
    .filter((b) => b.title.trim() || b.description.trim())
    .map(
      (b) => `
        <div class="news">
          <h4>${escapeHtml(b.title)}</h4>
          <p>${escapeMultiline(b.description)}</p>
        </div>`
    )
    .join('')

  const ctaHtml =
    ctaUrl && ctaLabel
      ? `<div class="cta"><a href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaLabel)}</a></div>`
      : ''

  const footer =
    footerNote ??
    'SISU · Plataforma de Recursos Humanos (El Salvador, Guatemala y Honduras). Recibes este correo como administrador de tu empresa en SISU.'

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
    <style>${styles()}</style>
  </head>
  <body>
    <div class="outer">
      <div class="card">
        <div class="hero">
          ${badgeHtml}
          <h1>${escapeHtml(title)}</h1>
          ${introHtml}
        </div>
        <div class="content">
          ${blocksHtml}
          ${ctaHtml}
        </div>
        <div class="footer">
          <hr />
          ${escapeHtml(footer)}
        </div>
      </div>
    </div>
  </body>
</html>`
}

/** Plain-text fallback derived from the structured content. */
export function buildBroadcastEmailText(input: BuildBroadcastEmailInput): string {
  const parts: string[] = [input.title]
  if (input.intro) parts.push(input.intro)
  for (const b of input.blocks ?? []) {
    if (b.title.trim() || b.description.trim()) {
      parts.push(`\n- ${b.title}\n  ${b.description}`)
    }
  }
  if (input.ctaUrl) parts.push(`\n${input.ctaLabel ?? 'Ver más'}: ${input.ctaUrl}`)
  return parts.join('\n').trim()
}
