const BASIC_EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/

/** Domains that are almost always typos or non-deliverable placeholders. */
const BLOCKED_DOMAINS = new Set([
  'ggmail.com',
  'gmial.com',
  'gmai.com',
  'gamil.com',
  'gnail.com',
  'gmal.com',
  'hotmial.com',
  'hotmal.com',
  'yaho.com',
  'email.com',
])

/** Provider name glued into local part while using @gmail.com (e.g. fooicloud@gmail.com). */
const ICLOUD_IN_LOCAL_GMAIL_RE = /icloud/i

/** Website TLD pasted before @gmail.com (e.g. nombre.com@gmail.com). */
const TLD_IN_LOCAL_GMAIL_RE = /\.(com|net|org|edu|gov|hn|sv|gt|io|co)@gmail\.com$/i

export type LeadEmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; message: string }

/**
 * Stricter email validation for marketing TOFU forms (/info, etc.).
 * Rejects syntactically valid addresses that are obvious typos or undeliverable.
 */
export function validateLeadEmail(raw: string): LeadEmailValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, message: 'El email es requerido' }
  }

  const email = raw.trim().toLowerCase()

  if (!BASIC_EMAIL_RE.test(email)) {
    return { ok: false, message: 'Por favor ingresa un email válido' }
  }

  if (email.length > 254) {
    return { ok: false, message: 'El email es demasiado largo' }
  }

  if (email.includes('..') || email.startsWith('.') || email.includes('@.')) {
    return { ok: false, message: 'Por favor ingresa un email válido' }
  }

  const [, domain] = email.split('@')
  if (!domain || BLOCKED_DOMAINS.has(domain)) {
    return { ok: false, message: 'Revisa el dominio del correo (por ejemplo @gmail.com)' }
  }

  if (TLD_IN_LOCAL_GMAIL_RE.test(email)) {
    return {
      ok: false,
      message: 'El correo parece mal escrito. Usa solo tu usuario antes de @gmail.com',
    }
  }

  if (domain === 'gmail.com' && ICLOUD_IN_LOCAL_GMAIL_RE.test(email.split('@')[0] ?? '')) {
    return {
      ok: false,
      message: 'Si usas iCloud, el correo debe terminar en @icloud.com',
    }
  }

  if (domain.endsWith('comy') || email.endsWith('.comy')) {
    return { ok: false, message: 'Por favor ingresa un email válido' }
  }

  return { ok: true, email }
}

/** Client-friendly message for SealedEnvelopeLead and similar UIs. */
export function leadEmailValidationMessage(raw: string): string | undefined {
  const result = validateLeadEmail(raw)
  return result.ok ? undefined : result.message
}
