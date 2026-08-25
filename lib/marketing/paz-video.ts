/** Public /paz video gate — YouTube is public; the gate is UX + lead, not DRM. */

export const PAZ_PUBLIC_PATH = '/paz'
export const PAZ_UNLOCK_QUERY = 'unlock'
export const PAZ_UNLOCK_STORAGE_KEY = 'hs_paz_video_unlock_v1'
export const PAZ_YOUTUBE_VIDEO_ID = 'TTrBvcpDM3k'
export const PAZ_YOUTUBE_WATCH_URL = `https://www.youtube.com/watch?v=${PAZ_YOUTUBE_VIDEO_ID}`
export const PAZ_YOUTUBE_EMBED_SRC = `https://www.youtube.com/embed/${PAZ_YOUTUBE_VIDEO_ID}`

export function pazUnlockPath(): string {
  return `${PAZ_PUBLIC_PATH}?${PAZ_UNLOCK_QUERY}=1`
}

export function pazUnlockHref(siteUrl: string): string {
  const site = siteUrl.replace(/\/$/, '')
  return `${site}${pazUnlockPath()}`
}
