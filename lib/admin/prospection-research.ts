/**
 * Local-business research pipeline (skill-aligned) for Super Admin prospection.
 * Uses SERPER_API_KEY when present. Never invents phones/emails.
 */

import {
  isValidConfidence,
  normalizeProspectEmail,
  type B2bProspectConfidence,
  type ImportContactInput,
} from './prospection'
import { normalizeHnPhone } from './prospection-whatsapp'

export type ResearchCandidate = {
  comercio: string
  rubro: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  confianza: B2bProspectConfidence
  fuentes: string
  notas: string | null
}

type SerperOrganic = {
  title?: string
  link?: string
  snippet?: string
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []
  const out: string[] = []
  for (const m of matches) {
    const n = normalizeProspectEmail(m)
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

function extractPhones(text: string): string[] {
  const matches =
    text.match(/(?:\+?504[\s-]*)?(?:\d{4}[\s-]?\d{4}|\d{8})/g) || []
  const out: string[] = []
  for (const m of matches) {
    const n = normalizeHnPhone(m)
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|\-–—].*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function buildQueries(params: {
  ciudad: string
  departamento: string | null
  pais: string
  rubros: string[]
}): string[] {
  const city = params.ciudad.trim()
  const dep = params.departamento?.trim() || ''
  const region = [city, dep, params.pais].filter(Boolean).join(' ')
  const rubros = params.rubros.length ? params.rubros : ['ferretería']
  const queries: string[] = []

  for (const rubro of rubros.slice(0, 4)) {
    queries.push(`"${rubro}" "${city}" ${dep} teléfono`.trim())
    queries.push(`"${rubro}" "${city}" email OR correo OR WhatsApp`.trim())
    queries.push(`"${rubro}" ${region} dirección`.trim())
  }
  return Array.from(new Set(queries)).slice(0, 8)
}

async function serperSearch(query: string): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey) return []

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      gl: 'hn',
      hl: 'es',
      num: 10,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Serper ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = (await res.json()) as { organic?: SerperOrganic[] }
  return Array.isArray(json.organic) ? json.organic : []
}

function mergeCandidate(
  map: Map<string, ResearchCandidate>,
  incoming: ResearchCandidate
): void {
  const key = (
    normalizeProspectEmail(incoming.email) ||
    `name:${incoming.comercio.toLowerCase()}`
  ).toLowerCase()
  const prev = map.get(key)
  if (!prev) {
    map.set(key, incoming)
    return
  }

  const fuentes = Array.from(
    new Set(
      `${prev.fuentes};${incoming.fuentes}`
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).join('; ')

  const rank = (c: B2bProspectConfidence) =>
    c === 'alta' ? 3 : c === 'media' ? 2 : c === 'baja' ? 1 : 0

  map.set(key, {
    comercio: prev.comercio || incoming.comercio,
    rubro: prev.rubro || incoming.rubro,
    telefono: prev.telefono || incoming.telefono,
    email: prev.email || incoming.email,
    direccion: prev.direccion || incoming.direccion,
    confianza: rank(incoming.confianza) > rank(prev.confianza) ? incoming.confianza : prev.confianza,
    fuentes,
    notas: prev.notas || incoming.notas,
  })
}

function candidateFromOrganic(
  item: SerperOrganic,
  rubroHint: string | null,
  ciudad: string
): ResearchCandidate | null {
  const title = cleanTitle(item.title || '')
  if (!title || title.length < 3) return null

  const blob = `${item.title || ''} ${item.snippet || ''} ${item.link || ''}`
  const cityHit = blob.toLowerCase().includes(ciudad.toLowerCase())
  const emails = extractEmails(blob)
  const phones = extractPhones(blob)

  // Skip pure directories / aggregators without a business name signal
  if (/yelp|facebook|instagram|wikipedia|linkedin/i.test(item.link || '') && !emails.length && !phones.length) {
    return null
  }

  let confianza: B2bProspectConfidence = 'baja'
  if ((emails.length || phones.length) && cityHit) confianza = 'media'
  if (emails.length && phones.length && cityHit) confianza = 'alta'
  if (!cityHit && !emails.length && !phones.length) return null

  return {
    comercio: title,
    rubro: rubroHint,
    telefono: phones[0] || null,
    email: emails[0] || null,
    direccion: cityHit ? ciudad : null,
    confianza,
    fuentes: item.link || 'serper',
    notas: item.snippet?.slice(0, 240) || null,
  }
}

export function researchProviderConfigured(): boolean {
  return Boolean(process.env.SERPER_API_KEY?.trim())
}

export async function researchLocalBusinesses(params: {
  ciudad: string
  departamento?: string | null
  pais?: string
  rubros: string[]
}): Promise<{ candidates: ResearchCandidate[]; queries: string[]; provider: string }> {
  const ciudad = params.ciudad.trim()
  if (!ciudad) throw new Error('ciudad is required')

  if (!researchProviderConfigured()) {
    throw new Error(
      'SERPER_API_KEY no configurada. Configura la key o importa hallazgos JSON manualmente.'
    )
  }

  const queries = buildQueries({
    ciudad,
    departamento: params.departamento || null,
    pais: params.pais || 'Honduras',
    rubros: params.rubros,
  })

  const map = new Map<string, ResearchCandidate>()
  const rubroHint = params.rubros[0] || null

  for (const q of queries) {
    const organic = await serperSearch(q)
    for (const item of organic) {
      const c = candidateFromOrganic(item, rubroHint, ciudad)
      if (c) mergeCandidate(map, c)
    }
  }

  // Cross-check: bump confidence when both email and phone present after merge
  const candidates = Array.from(map.values()).map((c) => {
    if (c.email && c.telefono && (c.confianza === 'baja' || c.confianza === 'media')) {
      return { ...c, confianza: 'alta' as const }
    }
    return c
  })

  candidates.sort((a, b) => {
    const rank = (c: B2bProspectConfidence) =>
      c === 'alta' ? 3 : c === 'media' ? 2 : c === 'baja' ? 1 : 0
    return rank(b.confianza) - rank(a.confianza) || a.comercio.localeCompare(b.comercio)
  })

  return { candidates, queries, provider: 'serper' }
}

/**
 * Parse pasted skill/UI JSON. Accepts raw array, { candidates: [] }, or ```json fences.
 */
export function parseResearchImportPaste(raw: string): ImportContactInput[] {
  let text = raw.trim()
  if (!text) return []

  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  if (fence) text = fence[1].trim()

  // If agent pasted prose + JSON, take outermost array or object
  if (!text.startsWith('[') && !text.startsWith('{')) {
    const startArr = text.indexOf('[')
    const startObj = text.indexOf('{')
    if (startArr >= 0 && (startObj < 0 || startArr < startObj)) {
      text = text.slice(startArr)
      const end = text.lastIndexOf(']')
      if (end >= 0) text = text.slice(0, end + 1)
    } else if (startObj >= 0) {
      text = text.slice(startObj)
      const end = text.lastIndexOf('}')
      if (end >= 0) text = text.slice(0, end + 1)
    }
  }

  const parsed = JSON.parse(text) as unknown
  if (Array.isArray(parsed)) return parsed as ImportContactInput[]
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { candidates?: unknown }).candidates)) {
    return (parsed as { candidates: ImportContactInput[] }).candidates
  }
  throw new Error('JSON inválido: se espera un array [{comercio,...}] o { "candidates": [...] }')
}

export function normalizeResearchImport(rows: ImportContactInput[]): ResearchCandidate[] {
  const out: ResearchCandidate[] = []
  for (const row of rows) {
    const comercio = (row.comercio || '').trim()
    if (!comercio) continue
    const emailRaw = row.email?.trim() || null
    const email =
      !emailRaw || emailRaw.toLowerCase() === 'sin_dato' ? null : normalizeProspectEmail(emailRaw)
    const telefonoRaw = row.telefono?.trim() || null
    const telefono =
      !telefonoRaw || telefonoRaw.toLowerCase() === 'sin_dato'
        ? null
        : normalizeHnPhone(telefonoRaw)
    const confianza = isValidConfidence(row.confianza) ? row.confianza : 'media'
    out.push({
      comercio,
      rubro: row.rubro?.trim() || null,
      telefono,
      email,
      direccion: row.direccion?.trim() || null,
      confianza,
      fuentes: row.fuentes?.trim() || 'import',
      notas: row.notas?.trim() || null,
    })
  }
  return out
}
