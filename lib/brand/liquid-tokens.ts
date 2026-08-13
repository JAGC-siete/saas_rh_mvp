/**
 * Shared design tokens — Infraestructura Líquida (landing, emails, PDFs).
 * Single source of truth for brand colors across channels.
 */

export const LIQUID = {
  meshBase: '#020617',
  bgStart: '#0f172a',
  bgMid: '#1e3a8a',
  bgEnd: '#312e81',
  brand900: '#1e3a8a',
  brand800: '#1e40af',
  brand500: '#3b82f6',
  brand600: '#2563eb',
  text: '#f8fafc',
  textBody: '#e2e8f0',
  textMuted: '#94a3b8',
  textSoft: '#bfdbfe',
  textAccent: '#93c5fd',
  glassBg: 'rgba(15, 23, 42, 0.6)',
  glassBgLight: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderLight: 'rgba(255, 255, 255, 0.22)',
  success: '#34d399',
  successDark: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(52, 211, 153, 0.35)',
  warning: '#fde68a',
  warningBg: 'rgba(251, 191, 36, 0.10)',
  warningBorder: 'rgba(245, 158, 11, 0.28)',
  accentWhatsApp: '#25D366',
  accentWhatsAppDark: '#128C7E',
  /** Readable dark text on light PDF panels */
  ink: '#0f172a',
  inkBody: '#334155',
  inkMuted: '#64748b',
  panelBg: '#f8fafc',
  panelBgAlt: '#f1f5f9',
  panelBorder: '#e2e8f0',
  urgencyBg: '#fffbeb',
  urgencyBorder: '#fcd34d',
  urgencyText: '#92400e',
} as const

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')
