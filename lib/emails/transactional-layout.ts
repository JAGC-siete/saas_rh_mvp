const BRAND = '#0b4fa1'
const TEXT = '#1a1a1a'
const MUTED = '#5c6570'
const BG = '#f4f6f8'
const BORDER = '#e2e8f0'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function transactionalParagraph(text: string): string {
  return `<p style="margin: 0 0 14px 0; color: ${MUTED}; font-size: 15px; line-height: 1.6;">${text}</p>`
}

export function transactionalKeyValueTable(
  rows: Array<{ label: string; value: string; emphasize?: boolean }>
): string {
  const tr = rows
    .map(
      (row) => `
        <tr>
          <td style="padding: 10px 0; color: ${MUTED}; font-size: 14px; border-bottom: 1px solid ${BORDER};">${escapeHtml(row.label)}</td>
          <td style="padding: 10px 0; color: ${row.emphasize ? '#0d5c2f' : TEXT}; font-size: 14px; text-align: right; font-weight: ${row.emphasize ? '700' : '600'}; border-bottom: 1px solid ${BORDER};">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join('')

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 18px 0;">
      ${tr}
    </table>
  `
}

export function transactionalBulletList(items: string[]): string {
  return `
    <ul style="margin: 0 0 16px 0; padding-left: 20px; color: ${MUTED}; font-size: 14px; line-height: 1.7;">
      ${items.map((item) => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
    </ul>
  `
}

export function transactionalCta(href: string, label: string): string {
  return `
    <motion></motion>
  `.replace(
    '<motion></motion>',
    `<div style="text-align: center; margin: 28px 0 8px 0;">
      <a href="${href}" style="background: ${BRAND}; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 700; font-size: 15px;">${escapeHtml(label)}</a>
    </div>`
  )
}

export function transactionalInfoBox(contentHtml: string, variant: 'neutral' | 'warning' = 'neutral'): string {
  const styles =
    variant === 'warning'
      ? `background: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e;`
      : `background: #f8fafc; border-left: 4px solid ${BRAND}; color: ${MUTED};`

  return `<motion></motion>`.replace(
    '<motion></motion>',
    `<div style="${styles} padding: 14px 16px; border-radius: 6px; margin: 18px 0; font-size: 14px; line-height: 1.55;">${contentHtml}</div>`
  )
}

export interface TransactionalEmailOptions {
  title: string
  subtitle?: string
  bodyHtml: string
  footerNote?: string
}

export function wrapTransactionalEmail(options: TransactionalEmailOptions): string {
  const { title, subtitle, bodyHtml, footerNote } = options
  const year = new Date().getFullYear()
  const subtitleBlock = subtitle
    ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: ${MUTED};">${escapeHtml(subtitle)}</p>`
    : ''
  const footer = footerNote
    ? escapeHtml(footerNote)
    : 'Correo automático de Humano SISU. No responda a este mensaje.'

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background: ${BG};">
      <div style="background: #ffffff; border: 1px solid ${BORDER}; border-radius: 10px; overflow: hidden;">
        <div style="padding: 22px 28px 18px 28px; border-bottom: 3px solid ${BRAND};">
          <p style="margin: 0 0 6px 0; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: ${MUTED};">Humano SISU</p>
          <h1 style="margin: 0; font-size: 22px; line-height: 1.35; color: ${TEXT}; font-weight: 700;">${escapeHtml(title)}</h1>
          ${subtitleBlock}
        </div>
        <div style="padding: 24px 28px 28px 28px;">
          ${bodyHtml}
        </div>
      </div>
      <div style="padding: 18px 8px 0 8px; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">${footer}</p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${year} Humano SISU · <a href="${SITE_URL}" style="color: #64748b; text-decoration: none;">${SITE_URL.replace(/^https?:\/\//, '')}</a></p>
      </div>
    </div>
  `
}
