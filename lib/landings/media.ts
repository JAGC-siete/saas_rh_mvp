/**
 * Fotos de una landing en el bucket público `landing-pages`.
 * El cliente nunca elige la ruta: el servidor arma `{landingId}/{uuid}.ext`.
 */

import { randomUUID } from 'crypto'

export const LANDING_MEDIA_BUCKET = 'landing-pages'
export const LANDING_MEDIA_MAX_BYTES = 5 * 1024 * 1024

export const LANDING_MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type LandingMediaMime = (typeof LANDING_MEDIA_MIME_TYPES)[number]

const LANDING_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OBJECT_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

export function isLandingMediaMime(mime: string): mime is LandingMediaMime {
  return (LANDING_MEDIA_MIME_TYPES as readonly string[]).includes(mime)
}

export function extensionForLandingMedia(mime: string): '.jpg' | '.png' | '.webp' | null {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  return null
}

/** Ruta dentro del bucket. `fileId` se inyecta en tests. */
export function landingMediaObjectPath(landingId: string, mime: string, fileId = randomUUID()): string {
  if (!LANDING_ID_RE.test(landingId)) throw new Error('Landing inválida')
  const ext = extensionForLandingMedia(mime)
  if (!ext || !LANDING_ID_RE.test(fileId)) throw new Error('Archivo de imagen inválido')
  return `${landingId}/${fileId}${ext}`
}

/**
 * Acepta solo la URL pública de ESTE bucket y ESTA landing.
 * Una URL externa, de otro bucket o de otra página no se puede borrar desde aquí.
 */
export function landingMediaPathFromPublicUrl(url: string, landingId: string): string | null {
  if (!LANDING_ID_RE.test(landingId)) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  const marker = `/storage/v1/object/public/${LANDING_MEDIA_BUCKET}/`
  const index = parsed.pathname.indexOf(marker)
  if (index === -1) return null
  const objectPath = decodeURIComponent(parsed.pathname.slice(index + marker.length))
  const [owner, file] = objectPath.split('/')
  if (owner !== landingId || !file || objectPath.split('/').length !== 2) return null
  if (!OBJECT_FILE_RE.test(file)) return null
  return objectPath
}

/** Recorre el JSON y junta las rutas de este bucket que la página todavía usa. */
export function collectLandingMediaPaths(content: unknown, landingId: string): Set<string> {
  const paths = new Set<string>()
  walk(content, landingId, paths)
  return paths
}

function walk(value: unknown, landingId: string, into: Set<string>): void {
  if (typeof value === 'string') {
    const path = landingMediaPathFromPublicUrl(value, landingId)
    if (path) into.add(path)
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, landingId, into)
    return
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) walk(entry, landingId, into)
  }
}

/**
 * Nombres que existen en `{landingId}/` y que ningún JSON conservado cita.
 * `keepContents` incluye el borrador nuevo y, si sigue publicada, el snapshot público.
 */
export function landingMediaObjectNamesToDelete(existingNames: readonly string[], keepPaths: ReadonlySet<string>): string[] {
  const keepNames = new Set(
    [...keepPaths].map((path) => path.split('/')[1]).filter((name): name is string => Boolean(name))
  )
  return existingNames.filter((name) => OBJECT_FILE_RE.test(name) && !keepNames.has(name))
}
