/**
 * Liquid email layout — mesh gradient + glass card (email-safe static approximation).
 * Used by transactional, broadcast, ventas, marketing and public-tool emails.
 */

import { LIQUID, SITE_URL } from '../brand/liquid-tokens'

const T = LIQUID

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function escapeMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

/** Inline emphasis for body copy on dark glass backgrounds. */
export function liquidEmphasis(text: string): string {
  return `<strong style="color: ${T.text};">${text}</strong>`
}

export function liquidEmailStyles(extraCss = ''): string {
  const {
    bgStart,
    bgMid,
    bgEnd,
    brand500,
    brand600,
    textSoft,
    textMuted,
    glassBg,
    glassBorderLight,
  } = T

  return `
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: ${bgStart};
      color: ${T.text};
    }
    .outer {
      width: 100%;
      padding: 32px 16px;
      background-color: ${bgStart};
      background-image:
        radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.06), transparent 60%),
        radial-gradient(1000px 500px at 80% 90%, rgba(255,255,255,0.04), transparent 60%),
        linear-gradient(160deg, ${bgStart}, ${bgMid} 50%, ${bgEnd});
    }
    .card {
      max-width: 640px;
      margin: 0 auto;
      background: ${glassBg};
      border-radius: 20px;
      border: 1px solid ${glassBorderLight};
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .hero {
      padding: 36px 40px 28px 40px;
      background: linear-gradient(160deg, rgba(30,58,138,0.55), rgba(49,46,129,0.35));
      border-bottom: 1px solid ${glassBorderLight};
      text-align: center;
    }
    .hero h1 {
      margin: 0;
      font-size: 24px;
      color: #ffffff;
      letter-spacing: -0.5px;
      font-weight: 700;
      line-height: 1.35;
    }
    .hero p {
      margin: 12px 0 0 0;
      font-size: 15px;
      color: ${textSoft};
      line-height: 1.55;
    }
    .brand-label {
      margin: 0 0 8px 0;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${textMuted};
    }
    .badge {
      display: inline-block;
      margin-bottom: 18px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(59, 130, 246, 0.18);
      color: ${T.textAccent};
      border: 1px solid rgba(59, 130, 246, 0.35);
    }
    .content { padding: 32px 40px 40px 40px; }
    .panel {
      background: ${T.glassBgLight};
      border: 1px solid ${glassBorderLight};
      border-radius: 16px;
      padding: 18px 20px;
      margin: 18px 0;
    }
    .news { composes: panel; }
    .news + .news { margin-top: 14px; }
    .cta { text-align: center; margin: 28px 0 8px 0; }
    .cta a {
      display: inline-block;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      background: linear-gradient(135deg, ${brand500}, ${brand600});
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
    }
    .footer {
      text-align: center;
      padding: 28px 24px 36px 24px;
      font-size: 12px;
      color: ${textMuted};
      opacity: 0.9;
    }
    .footer hr {
      border: 0;
      border-top: 1px solid ${glassBorderLight};
      margin-bottom: 18px;
    }
    @media (max-width: 520px) {
      .hero, .content { padding: 24px; }
      .cta a { width: 100%; box-sizing: border-box; }
    }
    ${extraCss}
  `.replace('.news { composes: panel; }', `.news { background: ${T.glassBgLight}; border: 1px solid ${glassBorderLight}; border-radius: 16px; padding: 18px 20px; }`)
}

export function liquidParagraph(text: string): string {
  return `<p style="margin: 0 0 14px 0; color: ${T.textSoft}; font-size: 15px; line-height: 1.6;">${text}</p>`
}

export function liquidKeyValueTable(
  rows: Array<{ label: string; value: string; emphasize?: boolean }>
): string {
  const tr = rows
    .map(
      (row) => `
        <tr>
          <td style="padding: 10px 0; color: ${T.textMuted}; font-size: 14px; border-bottom: 1px solid ${T.glassBorderLight};">${escapeHtml(row.label)}</td>
          <td style="padding: 10px 0; color: ${row.emphasize ? T.success : T.text}; font-size: 14px; text-align: right; font-weight: ${row.emphasize ? '700' : '600'}; border-bottom: 1px solid ${T.glassBorderLight};">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join('')

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 18px 0;">
      ${tr}
    </table>
  `
}

export function liquidBulletList(items: string[]): string {
  return `
    <ul style="margin: 0 0 16px 0; padding-left: 20px; color: ${T.textSoft}; font-size: 14px; line-height: 1.7;">
      ${items.map((item) => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
    </ul>
  `
}

export function liquidCta(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 28px 0 8px 0;">
      <a href="${href}" style="display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; background: linear-gradient(135deg, ${T.brand500}, ${T.brand600}); color: #ffffff; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);">${escapeHtml(label)}</a>
    </div>`
}

export function liquidCtaWhatsApp(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 28px 0 8px 0;">
      <a href="${href}" style="display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; background: ${T.accentWhatsApp}; color: #ffffff; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.3);">${escapeHtml(label)}</a>
    </div>`
}

export function liquidInfoBox(contentHtml: string, variant: 'neutral' | 'warning' = 'neutral'): string {
  const styles =
    variant === 'warning'
      ? `background: ${T.warningBg}; border: 1px solid ${T.warningBorder}; color: ${T.warning};`
      : `background: ${T.glassBgLight}; border: 1px solid ${T.glassBorderLight}; color: ${T.textSoft};`

  return `<div style="${styles} padding: 14px 16px; border-radius: 16px; margin: 18px 0; font-size: 14px; line-height: 1.55;">${contentHtml}</div>`
}

export function liquidPanel(contentHtml: string, title?: string): string {
  const titleBlock = title
    ? `<p style="margin: 0 0 12px 0; font-size: 11px; font-weight: bold; color: ${T.textAccent}; text-transform: uppercase; letter-spacing: 0.06em;">${escapeHtml(title)}</p>`
    : ''
  return `
    <div style="background: ${T.glassBgLight}; border: 1px solid ${T.glassBorderLight}; border-radius: 16px; padding: 18px 20px; margin: 18px 0;">
      ${titleBlock}
      ${contentHtml}
    </div>`
}

export function liquidCodeBlock(value: string): string {
  return `<span style="font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace; background: rgba(59, 130, 246, 0.12); border-radius: 10px; padding: 12px 14px; display: inline-block; color: ${T.text}; letter-spacing: ${value.length <= 8 ? '4px' : '0'};">${escapeHtml(value)}</span>`
}

export interface WrapLiquidEmailOptions {
  title: string
  subtitle?: string
  badge?: string
  bodyHtml: string
  footerNote?: string
  extraCss?: string
  /** When false, bodyHtml is rendered without hero (full custom layout inside card). */
  showHero?: boolean
}

export function wrapLiquidEmail(options: WrapLiquidEmailOptions): string {
  const { title, subtitle, badge, bodyHtml, footerNote, extraCss, showHero = true } = options
  const year = new Date().getFullYear()
  const subtitleBlock = subtitle
    ? `<p>${escapeMultiline(subtitle)}</p>`
    : ''
  const badgeHtml = badge ? `<div class="badge">${escapeHtml(badge)}</div>` : ''
  const footer = footerNote
    ? escapeHtml(footerNote)
    : 'Correo automático de Humano SISU. No responda a este mensaje.'

  const heroBlock = showHero
    ? `
        <div class="hero">
          ${badgeHtml}
          <h1>${escapeHtml(title)}</h1>
          ${subtitleBlock}
        </div>`
    : ''

  const contentBlock = showHero
    ? `<div class="content">${bodyHtml}</div>`
    : bodyHtml

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
    <style>${liquidEmailStyles(extraCss)}</style>
  </head>
  <body>
    <div class="outer">
      <div class="card">
        ${heroBlock}
        ${contentBlock}
        <div class="footer">
          <hr />
          <p style="margin: 0 0 6px 0;">${footer}</p>
          <p style="margin: 0;">© ${year} Humano SISU · <a href="${SITE_URL}" style="color: ${T.textMuted}; text-decoration: none;">${SITE_URL.replace(/^https?:\/\//, '')}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`
}

/** Fragment wrapper for emails that embed custom body without full document (legacy ventas). */
export function wrapLiquidEmailFragment(bodyHtml: string): string {
  return wrapLiquidEmail({
    title: 'Humano SISU',
    showHero: false,
    bodyHtml: `<div class="content" style="padding: 32px 40px 24px 40px;">
      <p class="brand-label" style="margin: 0 0 20px 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: ${T.textMuted};">Humano SISU</p>
      ${bodyHtml}
    </div>`,
    footerNote: 'Humano SISU · Plataforma de Recursos Humanos',
  })
}
