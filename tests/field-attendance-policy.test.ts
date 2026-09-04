import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveFieldAttendancePolicy,
  validateFieldGeolocation,
  DEFAULT_FIELD_ATTENDANCE_POLICY,
} from '../lib/attendance/field-policy'

describe('resolveFieldAttendancePolicy', () => {
  it('returns defaults when settings empty', () => {
    const p = resolveFieldAttendancePolicy(null)
    assert.deepEqual(p, DEFAULT_FIELD_ATTENDANCE_POLICY)
  })

  it('merges company field_attendance overrides but always requires webauthn', () => {
    const p = resolveFieldAttendancePolicy({
      field_attendance: {
        enforce_geofence: true,
        max_accuracy_m: 80,
        max_geo_age_ms: 30_000,
        require_webauthn: false,
      },
    })
    assert.equal(p.enforce_geofence, true)
    assert.equal(p.max_accuracy_m, 80)
    assert.equal(p.max_geo_age_ms, 30_000)
    assert.equal(p.require_webauthn, true)
  })
})

describe('validateFieldGeolocation', () => {
  const policy = DEFAULT_FIELD_ATTENDANCE_POLICY
  const now = 1_700_000_000_000

  it('accepts fresh accurate fix', () => {
    const r = validateFieldGeolocation(
      { lat: 14.07, lon: -87.19, accuracy_m: 25, geo_ts: now - 5_000 },
      policy,
      now
    )
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.lat, 14.07)
      assert.equal(r.accuracy_m, 25)
    }
  })

  it('rejects missing coords', () => {
    const r = validateFieldGeolocation({}, policy, now)
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.code, 'GEO_MISSING')
  })

  it('rejects poor accuracy', () => {
    const r = validateFieldGeolocation(
      { lat: 14.07, lon: -87.19, accuracy_m: 500, geo_ts: now },
      policy,
      now
    )
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.code, 'GEO_ACCURACY')
  })

  it('rejects stale fix', () => {
    const r = validateFieldGeolocation(
      { lat: 14.07, lon: -87.19, accuracy_m: 20, geo_ts: now - 200_000 },
      policy,
      now
    )
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.code, 'GEO_STALE')
  })

  it('rejects invalid lat', () => {
    const r = validateFieldGeolocation(
      { lat: 120, lon: -87.19, accuracy_m: 20, geo_ts: now },
      policy,
      now
    )
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.code, 'GEO_INVALID')
  })
})
