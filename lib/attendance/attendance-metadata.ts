/**
 * Company attendance configuration (company_metadata.attendance_metadata JSONB).
 */

export const BIOMETRIC_MODES = ['STRICT_2', 'STRICT_4', 'FLEXIBLE'] as const
export type BiometricMode = (typeof BIOMETRIC_MODES)[number]

export const DEFAULT_ATTENDANCE_TIMEZONE = 'America/Tegucigalpa'

export interface AttendanceMetadata {
  biometric_mode?: BiometricMode
  timezone?: string
}

export interface ResolvedAttendanceConfig {
  biometric_mode: BiometricMode
  timezone: string
}

function isBiometricMode(v: unknown): v is BiometricMode {
  return typeof v === 'string' && (BIOMETRIC_MODES as readonly string[]).includes(v)
}

/**
 * Load attendance_metadata for a company with safe defaults.
 */
export async function getResolvedAttendanceConfig(
  supabase: { from: (t: string) => any },
  companyId: string
): Promise<ResolvedAttendanceConfig> {
  const { data: row } = await supabase
    .from('company_metadata')
    .select('attendance_metadata')
    .eq('company_id', companyId)
    .maybeSingle()

  const raw = (row?.attendance_metadata || {}) as Record<string, unknown>
  const meta = raw as AttendanceMetadata

  let timezone = typeof meta.timezone === 'string' && meta.timezone ? meta.timezone : DEFAULT_ATTENDANCE_TIMEZONE

  const { data: company } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .maybeSingle()

  const settings = (company?.settings || {}) as Record<string, unknown>
  if (timezone === DEFAULT_ATTENDANCE_TIMEZONE && typeof settings.timezone === 'string' && settings.timezone) {
    timezone = settings.timezone
  }

  const biometric_mode: BiometricMode = isBiometricMode(meta.biometric_mode) ? meta.biometric_mode : 'STRICT_2'

  return { biometric_mode, timezone }
}
