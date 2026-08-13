export type SeverityTone = 'info' | 'ok' | 'warn' | 'alert' | 'danger'

/** 3px pulse line at row start — liquid severity indicator */
export function getSeverityPulseClass(tone: SeverityTone): string {
  switch (tone) {
    case 'info':
      return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
    case 'ok':
      return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
    case 'warn':
      return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
    case 'alert':
      return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]'
    case 'danger':
      return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-critical-pulse'
    default:
      return 'bg-gray-500'
  }
}

export function getSeverityTextClass(tone: SeverityTone): string {
  switch (tone) {
    case 'info':
      return 'text-blue-400'
    case 'ok':
      return 'text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
    case 'warn':
      return 'text-amber-400'
    case 'alert':
      return 'text-orange-400'
    case 'danger':
      return 'text-rose-500 animate-critical-pulse'
    default:
      return 'text-gray-400'
  }
}

export function getOutsideSchedulePulseClass(gapMin?: number, horarioNoDetectado?: boolean): string {
  if (horarioNoDetectado) {
    return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)] animate-pulse-slow'
  }
  if (gapMin == null) {
    return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
  }
  if (gapMin > 30) {
    return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-critical-pulse'
  }
  if (gapMin > 15) {
    return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]'
  }
  return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
}

export function getOutsideScheduleTextClass(gapMin?: number, horarioNoDetectado?: boolean): string {
  if (horarioNoDetectado || (gapMin != null && gapMin > 30)) return 'text-rose-400'
  if (gapMin != null && gapMin > 15) return 'text-orange-400'
  return 'text-amber-400'
}
