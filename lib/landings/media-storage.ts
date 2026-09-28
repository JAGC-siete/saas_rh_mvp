/**
 * Borra del bucket las fotos que ya no aparecen en el borrador ni en lo publicado.
 * Un fallo aquí no revierte el guardado: la página queda consistente y el archivo se reintenta al siguiente save.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import {
  LANDING_MEDIA_BUCKET,
  collectLandingMediaPaths,
  landingMediaObjectNamesToDelete,
} from './media'

export async function pruneUnreferencedLandingMedia(
  admin: SupabaseClient,
  landingId: string,
  keepContents: unknown[]
): Promise<void> {
  const keep = new Set<string>()
  for (const content of keepContents) {
    for (const path of collectLandingMediaPaths(content, landingId)) keep.add(path)
  }

  const { data, error } = await admin.storage.from(LANDING_MEDIA_BUCKET).list(landingId, { limit: 1000 })
  if (error) {
    logger.error('No se pudo listar fotos de la landing', { landingId, error: error.message })
    return
  }

  const names = landingMediaObjectNamesToDelete(
    (data ?? []).map((file) => file.name).filter((name): name is string => Boolean(name)),
    keep
  )
  if (names.length === 0) return

  const { error: removeError } = await admin.storage
    .from(LANDING_MEDIA_BUCKET)
    .remove(names.map((name) => `${landingId}/${name}`))

  if (removeError) {
    logger.error('No se pudieron borrar fotos huérfanas de la landing', {
      landingId,
      error: removeError.message,
      count: names.length,
    })
  }
}
