/** Public slug for the TOFU funnel (internal page: pages/info.tsx). */
export const INFO_FUNNEL_PUBLIC_PATH = '/secreto'

export function infoMissionPublicPath(missionId: number): string {
  return `${INFO_FUNNEL_PUBLIC_PATH}/m/${missionId}`
}

/** @deprecated Internal route only — use INFO_FUNNEL_PUBLIC_PATH in user-facing URLs. */
export const INFO_FUNNEL_INTERNAL_PATH = '/info'

export function infoMissionInternalPath(missionId: number): string {
  return `${INFO_FUNNEL_INTERNAL_PATH}/m/${missionId}`
}
