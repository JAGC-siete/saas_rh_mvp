export function maskEmail(input: string): string {
  const email = String(input || '').trim()
  const at = email.indexOf('@')
  if (at <= 0) return '***'

  const local = email.slice(0, at)
  const domain = email.slice(at + 1)

  const [domainName, ...tldParts] = domain.split('.')
  const tld = tldParts.length > 0 ? `.${tldParts.join('.')}` : ''

  const maskPart = (value: string) => {
    if (!value) return '***'
    if (value.length === 1) return `${value}***`
    if (value.length === 2) return `${value[0]}***${value[1]}`
    return `${value.slice(0, 2)}***${value.slice(-1)}`
  }

  return `${maskPart(local)}@${maskPart(domainName)}${tld || ''}`
}

export function normalizeSoftPhone(input: unknown): string | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return null

  // Validación suave: permitimos +, dígitos, espacios, guiones y paréntesis.
  const cleaned = raw.replace(/[^\d+()\-\s]/g, '').trim()
  if (!cleaned) return null

  // Evitar guardar basura muy corta.
  const digitCount = (cleaned.match(/\d/g) || []).length
  if (digitCount < 7) return null

  return cleaned
}

