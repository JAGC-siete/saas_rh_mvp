/**
 * Branded broadcast/communication email builder.
 * Infraestructura Líquida — used by the super-admin Communication Center.
 */

import {
  escapeHtml,
  escapeMultiline,
  liquidParagraph,
  wrapLiquidEmail,
} from './liquid-layout'

export { escapeHtml }

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

const BROADCAST_EXTRA_CSS = `
  .news h4 { margin: 0 0 6px 0; font-size: 16px; color: #f8fafc; font-weight: 600; }
  .news p { margin: 0; font-size: 14px; color: #bfdbfe; line-height: 1.55; }
`

export function buildBroadcastEmailHtml(input: BuildBroadcastEmailInput): string {
  const { badge, title, intro, blocks = [], ctaUrl, ctaLabel, footerNote } = input

  const introHtml = intro ? liquidParagraph(escapeMultiline(intro)) : ''

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

  return wrapLiquidEmail({
    title,
    badge,
    bodyHtml: `${introHtml}${blocksHtml}${ctaHtml}`,
    footerNote: footer,
    extraCss: BROADCAST_EXTRA_CSS,
  })
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
