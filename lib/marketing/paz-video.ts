/** Public /paz video gate — YouTube is public; the gate is UX + lead, not DRM. */

export const PAZ_PUBLIC_PATH = '/paz'
export const PAZ_UNLOCK_QUERY = 'unlock'
export const PAZ_UNLOCK_STORAGE_KEY = 'hs_paz_video_unlock_v1'
export const PAZ_YOUTUBE_VIDEO_ID = 'TTrBvcpDM3k'
export const PAZ_YOUTUBE_WATCH_URL = `https://www.youtube.com/watch?v=${PAZ_YOUTUBE_VIDEO_ID}`
export const PAZ_YOUTUBE_EMBED_SRC = `https://www.youtube.com/embed/${PAZ_YOUTUBE_VIDEO_ID}`

/** Copy shown after the email gate (page reveal + pack email). Not on the public teaser. */
export const PAZ_METHOD_SUMMARY_TITLE = 'Resumen del método'

export const PAZ_METHOD_SUMMARY_LEAD =
  'El video explica cómo dejar de cerrar planilla a mano y pasar a un flujo digital: asistencia biométrica, motor de nómina con deducciones locales y comprobantes automáticos — sin ser una máquina de Excel.'

export const PAZ_METHOD_SUMMARY_POINTS = [
  'Registrar asistencia con biométrico conectado al software (sin USB ni planillas sueltas).',
  'Calcular nómina con reglas de ley locales (IHSS, RAP, ISR y equivalentes regionales).',
  'Revisar y aprobar la planilla en minutos, no en un domingo entero.',
  'Enviar comprobantes a cada colaborador por canales digitales.',
] as const

export function pazMethodSummaryPlainText(): string {
  return [
    PAZ_METHOD_SUMMARY_LEAD,
    '',
    ...PAZ_METHOD_SUMMARY_POINTS.map((point) => `• ${point}`),
  ].join('\n')
}

export function pazUnlockPath(): string {
  return `${PAZ_PUBLIC_PATH}?${PAZ_UNLOCK_QUERY}=1`
}

export function pazUnlockHref(siteUrl: string): string {
  const site = siteUrl.replace(/\/$/, '')
  return `${site}${pazUnlockPath()}`
}
