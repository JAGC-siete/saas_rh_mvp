/**
 * Settings access (schedules create-only vs full parametros).
 * Run: npm run test:security
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSettingsAccessFromProfile } from '../lib/security/settings-access'

describe('settings-access', () => {
  it('manager with can_create_work_schedules only: schedules tab path, no full settings', () => {
    const access = resolveSettingsAccessFromProfile({
      role: 'manager',
      permissions: {
        can_create_work_schedules: true,
        can_view_salary: false,
        can_view_departments: false,
      },
    })

    assert.equal(access.showSettingsNav, true)
    assert.equal(access.canCreateWorkSchedules, true)
    assert.equal(access.canAccessSchedulesCreateOnly, true)
    assert.equal(access.canViewFullSettings, false)
    assert.equal(access.canManageWorkSchedules, false)
  })

  it('hr_manager default: full settings view, manage schedules via manage_settings false', () => {
    const access = resolveSettingsAccessFromProfile({
      role: 'hr_manager',
      permissions: {},
    })

    assert.equal(access.canViewFullSettings, true)
    assert.equal(access.showSettingsNav, true)
    assert.equal(access.canAccessSchedulesCreateOnly, false)
  })

  it('manager without create permission: no settings nav', () => {
    const access = resolveSettingsAccessFromProfile({
      role: 'manager',
      permissions: { view_employees: true },
    })

    assert.equal(access.showSettingsNav, false)
    assert.equal(access.canCreateWorkSchedules, false)
  })
})
