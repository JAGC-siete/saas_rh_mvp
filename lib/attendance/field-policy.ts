/**
 * Field mobile attendance — geolocation policy & spoofing heuristics.
 * Used by /api/attendance/field/* and source=field_mobile on register.
 */

export type FieldAttendancePolicy = {
  /** If true and company has geofence center+radius, block outside radius. Default false (field staff). */
  enforce_geofence: boolean
  /** Reject GPS if reported accuracy worse than this (meters). Default 150. */
  max_accuracy_m: number
  /** Reject GPS older than this (ms). Default 90_000 (90s). */
  max_geo_age_ms: number
  /** Require WebAuthn assertion. Default true. */
  require_webauthn: boolean
}

export const DEFAULT_FIELD_ATTENDANCE_POLICY: FieldAttendancePolicy = {
  enforce_geofence: false,
  max_accuracy_m: 150,
  max_geo_age_ms: 90_000,
  require_webauthn: true,
}

export type CompanyFieldSettings = {
  field_attendance?: Partial<FieldAttendancePolicy>
}

export function resolveFieldAttendancePolicy(
  companySettings: unknown
): FieldAttendancePolicy {
  const settings = (companySettings && typeof companySettings === 'object'
    ? (companySettings as CompanyFieldSettings)
    : {}) as CompanyFieldSettings
  const partial = settings.field_attendance || {}
  return {
    enforce_geofence:
      typeof partial.enforce_geofence === 'boolean'
        ? partial.enforce_geofence
        : DEFAULT_FIELD_ATTENDANCE_POLICY.enforce_geofence,
    max_accuracy_m:
      typeof partial.max_accuracy_m === 'number' && partial.max_accuracy_m > 0
        ? partial.max_accuracy_m
        : DEFAULT_FIELD_ATTENDANCE_POLICY.max_accuracy_m,
    max_geo_age_ms:
      typeof partial.max_geo_age_ms === 'number' && partial.max_geo_age_ms > 0
        ? partial.max_geo_age_ms
        : DEFAULT_FIELD_ATTENDANCE_POLICY.max_geo_age_ms,
    require_webauthn: true, // always — DNI+GPS alone is not field identity
  }
}

export type GeoPayload = {
  lat: number
  lon: number
  accuracy_m: number
  geo_ts: number
}

export type GeoValidationOk = {
  ok: true
  lat: number
  lon: number
  accuracy_m: number
  geo_ts: number
  age_ms: number
}

export type GeoValidationFail = {
  ok: false
  code:
    | 'GEO_MISSING'
    | 'GEO_INVALID'
    | 'GEO_ACCURACY'
    | 'GEO_STALE'
    | 'GEO_UNAVAILABLE'
  message: string
}

export type GeoValidationResult = GeoValidationOk | GeoValidationFail

export function validateFieldGeolocation(
  input: Partial<GeoPayload> | null | undefined,
  policy: FieldAttendancePolicy,
  nowMs: number = Date.now()
): GeoValidationResult {
  if (!input || input.lat == null || input.lon == null) {
    return {
      ok: false,
      code: 'GEO_MISSING',
      message: 'Ubicación requerida. Activa el GPS e intenta de nuevo.',
    }
  }

  const lat = Number(input.lat)
  const lon = Number(input.lon)
  const accuracy_m = Number(input.accuracy_m)
  const geo_ts = Number(input.geo_ts)

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return {
      ok: false,
      code: 'GEO_INVALID',
      message: 'Coordenadas de ubicación inválidas.',
    }
  }

  if (!Number.isFinite(accuracy_m) || accuracy_m < 0) {
    return {
      ok: false,
      code: 'GEO_INVALID',
      message: 'Precisión de GPS inválida.',
    }
  }

  if (accuracy_m > policy.max_accuracy_m) {
    return {
      ok: false,
      code: 'GEO_ACCURACY',
      message: `GPS poco preciso (${Math.round(accuracy_m)} m). Muévete a un área abierta e intenta de nuevo.`,
    }
  }

  if (!Number.isFinite(geo_ts) || geo_ts <= 0) {
    return {
      ok: false,
      code: 'GEO_INVALID',
      message: 'Timestamp de ubicación inválido.',
    }
  }

  const age_ms = nowMs - geo_ts
  // Reject future timestamps beyond 30s clock skew and stale readings
  if (age_ms < -30_000) {
    return {
      ok: false,
      code: 'GEO_INVALID',
      message: 'Timestamp de ubicación inconsistente.',
    }
  }
  if (age_ms > policy.max_geo_age_ms) {
    return {
      ok: false,
      code: 'GEO_STALE',
      message: 'Ubicación desactualizada. Actualiza el GPS e intenta de nuevo.',
    }
  }

  return { ok: true, lat, lon, accuracy_m, geo_ts, age_ms }
}

export type FieldEventFlags = {
  channel: 'field_mobile'
  accuracy_m: number
  geo_ts: number
  geo_age_ms: number
  webauthn_verified: boolean
  webauthn_credential_id_prefix: string | null
  device_binding: 'platform'
  /** What we deliberately do NOT store */
  biometric_template_stored: false
}
