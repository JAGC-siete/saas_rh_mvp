/**
 * Formato de código de empleado exclusivo para Enlace:
 * letra(s) inicial(es) del primer nombre + últimos 5 dígitos del DNI.
 * Ej: Jorge Arturo Gomez Coello + 0510199100731 → J00731
 * Si hay duplicado → JO00731 (segunda letra), y así sucesivamente.
 */

export const ENLACE_COMPANY_ID = 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'

export function isEnlaceCompany(companyId: string | null | undefined): boolean {
  return companyId === ENLACE_COMPANY_ID
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

/** Letras A–Z del primer nombre, sin acentos ni caracteres especiales. */
export function enlaceFirstNameLetters(name: string): string {
  const firstWord = String(name || '')
    .trim()
    .split(/\s+/)[0] || ''
  return stripDiacritics(firstWord)
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

/** Últimos 5 dígitos del DNI (ignora guiones y otros no-dígitos). */
export function enlaceDniLast5(dni: string): string | null {
  const digits = String(dni || '').replace(/\D/g, '')
  if (digits.length < 5) return null
  return digits.slice(-5)
}

/**
 * Candidatos en orden: J00731, JO00731, JOR00731, ...
 * Vacío si name/dni no permiten generar el formato.
 */
export function enlaceEmployeeCodeCandidates(name: string, dni: string): string[] {
  const letters = enlaceFirstNameLetters(name)
  const last5 = enlaceDniLast5(dni)
  if (!letters || !last5) return []

  const candidates: string[] = []
  for (let i = 1; i <= letters.length; i++) {
    candidates.push(`${letters.slice(0, i)}${last5}`)
  }
  return candidates
}

/**
 * Primer candidato libre. Si todos están tomados, agrega sufijo numérico al último.
 */
export function resolveEnlaceEmployeeCode(
  name: string,
  dni: string,
  takenCodes: Iterable<string>
): string | null {
  const candidates = enlaceEmployeeCodeCandidates(name, dni)
  if (candidates.length === 0) return null

  const taken = new Set(
    Array.from(takenCodes)
      .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
      .map((c) => c.trim().toUpperCase())
  )

  for (const code of candidates) {
    if (!taken.has(code)) return code
  }

  const base = candidates[candidates.length - 1]
  let n = 2
  while (taken.has(`${base}${n}`)) n += 1
  return `${base}${n}`
}

/** Código sugerido sin chequear duplicados (primera letra + last5). */
export function suggestEnlaceEmployeeCode(name: string, dni: string): string | null {
  const candidates = enlaceEmployeeCodeCandidates(name, dni)
  return candidates[0] ?? null
}
