/**
 * Permisos granulares: reportes de asistencia para managers sin nómina.
 * Run: npx tsx --test tests/attendance-reports-permissions.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePermissionsToCanonical } from '../lib/security/canonical-permissions'
import {
  canExportReports,
  canExportAttendanceReports,
  canViewAttendanceReports,
} from '../lib/security/permissions'
import { canAccessReportsModule, allowedReportTypesForUser } from '../lib/security/report-access'

const attendanceOnlyPerms = {
  can_export_attendance_reports: true,
  can_view_attendance_reports: true,
}

describe('attendance-reports-permissions', () => {
  it('manager por defecto: reportes de asistencia sin nómina ni export general', () => {
    const canon = normalizePermissionsToCanonical('manager', {})
    assert.equal(canon.can_view_reports, false)
    assert.equal(canon.can_export_reports, false)
    assert.equal(canon.can_view_payroll, false)
    assert.equal(canon.can_view_attendance_reports, true)
    assert.equal(canon.can_export_attendance_reports, true)
    assert.equal(canExportReports('manager', { permissions: {} }), false)
    assert.equal(canExportAttendanceReports('manager', { permissions: {} }), true)
    assert.equal(canViewAttendanceReports('manager', { permissions: {} }), true)
  })

  it('manager con can_export_reports genérico no obtiene export completo', () => {
    assert.equal(
      canExportReports('manager', { permissions: { can_export_reports: true } }),
      false
    )
  })

  it('manager con permiso de asistencia: reportes acotados', () => {
    const canon = normalizePermissionsToCanonical('manager', attendanceOnlyPerms)
    assert.equal(canon.can_view_payroll, false)
    assert.equal(canon.can_manage_payroll, false)
    assert.equal(canon.can_view_reports, false)
    assert.equal(canon.can_export_reports, false)
    assert.equal(canon.can_view_attendance_reports, true)
    assert.equal(canon.can_export_attendance_reports, true)

    assert.equal(canExportAttendanceReports('manager', { permissions: attendanceOnlyPerms }), true)
    assert.equal(canViewAttendanceReports('manager', { permissions: attendanceOnlyPerms }), true)
    assert.equal(canExportReports('manager', { permissions: attendanceOnlyPerms }), false)
  })

  it('canAccessReportsModule y tabs solo asistencia para manager', () => {
    assert.equal(canAccessReportsModule('manager', attendanceOnlyPerms), true)
    assert.equal(canAccessReportsModule('manager', {}), true)
    assert.deepEqual(allowedReportTypesForUser('manager', attendanceOnlyPerms), ['attendance'])
    assert.deepEqual(allowedReportTypesForUser('manager', {}), ['attendance'])
    assert.equal(allowedReportTypesForUser('company_admin', {}), 'all')
  })

  it('company_admin conserva export completo', () => {
    assert.equal(canExportReports('company_admin', { permissions: {} }), true)
    assert.equal(canExportAttendanceReports('company_admin', { permissions: {} }), true)
  })
})
