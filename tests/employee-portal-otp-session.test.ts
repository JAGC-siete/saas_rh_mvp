/**
 * Guard: employee-portal OTP login opens the session with an admin-issued
 * one-time token, never with a password derived from the employee id, and
 * never returns a session without the employee's user_profiles row.
 * Run: npx tsx --test tests/employee-portal-otp-session.test.ts
 */
import { describe, it, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  EMPLOYEE_PORTAL_NOT_EMPLOYEE_ACCOUNT,
  openEmployeePortalSession,
  randomAuthPassword
} from '../lib/auth/employee-portal-session'
import { sendOtp, verifyOtp } from '../lib/employee-otp'

const EMPLOYEE = { id: '3f9a1c2e-0000-4000-8000-000000000001', name: 'Empleado Demo', company_id: 'company-1' }
const EMAIL = 'empleado.demo@example.com'

type Profile = { id: string; role: string; employee_id: string | null; company_id?: string }

function fakeSupabase(options: { existingUser?: boolean; profile?: Omit<Profile, 'id'>; profileInsertError?: string } = {}) {
  const users = new Map<string, { id: string; email: string; password: string; user_metadata: any }>()
  const profiles = new Map<string, Profile>()
  const tokens = new Map<string, string>()
  const calls = { createUser: [] as any[], profileInserts: [] as any[], signInWithPassword: 0 }

  if (options.existingUser) {
    users.set(EMAIL, { id: 'auth-existing', email: EMAIL, password: 'chosen-by-employee', user_metadata: {} })
    if (options.profile) profiles.set('auth-existing', { id: 'auth-existing', ...options.profile })
  }

  const admin: any = {
    auth: {
      admin: {
        async createUser(params: any) {
          calls.createUser.push(params)
          if (users.has(params.email)) {
            return { data: { user: null }, error: { code: 'email_exists', message: 'A user with this email address has already been registered' } }
          }
          const user = { id: `auth-${users.size + 1}`, email: params.email, password: params.password, user_metadata: params.user_metadata }
          users.set(params.email, user)
          return { data: { user }, error: null }
        },
        async generateLink(params: any) {
          const user = users.get(params.email)
          if (!user) return { data: { user: null, properties: null }, error: { message: 'User not found' } }
          const hashed_token = `token-${tokens.size + 1}`
          tokens.set(hashed_token, user.id)
          return { data: { user, properties: { hashed_token, verification_type: params.type } }, error: null }
        },
        async updateUserById(id: string, attrs: any) {
          const user = Array.from(users.values()).find((u) => u.id === id)!
          user.user_metadata = attrs.user_metadata
          return { data: { user }, error: null }
        }
      }
    },
    from(table: string) {
      assert.equal(table, 'user_profiles')
      let id: string | undefined
      const query: any = {
        select: () => query,
        eq: (_column: string, value: string) => {
          id = value
          return query
        },
        maybeSingle: async () => ({ data: (id && profiles.get(id)) || null, error: null }),
        insert: async (row: any) => {
          calls.profileInserts.push(row)
          if (options.profileInsertError) return { error: { message: options.profileInsertError } }
          profiles.set(row.id, row)
          return { error: null }
        }
      }
      return query
    }
  }

  const client: any = {
    auth: {
      async verifyOtp(params: { type: string; token_hash: string }) {
        const userId = tokens.get(params.token_hash)
        if (!userId || params.type !== 'magiclink') return { data: { user: null, session: null }, error: { message: 'Invalid token' } }
        tokens.delete(params.token_hash)
        const user = { id: userId, email: EMAIL }
        return { data: { user, session: { access_token: `jwt-${userId}`, refresh_token: 'refresh', user } }, error: null }
      },
      async signInWithPassword() {
        calls.signInWithPassword++
        return { data: { user: null, session: null }, error: { message: 'should not be called' } }
      }
    }
  }

  return { admin, client, users, profiles, calls }
}

afterEach(() => mock.restoreAll())

describe('Employee portal OTP session', () => {
  it('code sent → code verified → session returned, with a random password and an employee profile', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    let sentHtml = ''
    mock.method(globalThis, 'fetch', async (_url: string, init: any) => {
      sentHtml = JSON.parse(init.body).html
      return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } })
    })

    const sent = await sendOtp(EMAIL, EMPLOYEE.id, EMPLOYEE.name)
    assert.equal(sent.success, true)
    const code = sentHtml.match(/>(\d{6})<\/span>/)?.[1]
    assert.ok(code, 'OTP code is in the email')

    const wrongCode = String((Number(code) + 1) % 1000000).padStart(6, '0')
    assert.equal(verifyOtp(EMAIL, wrongCode).success, false)
    assert.equal(verifyOtp(EMAIL, code!).success, true)
    assert.equal(verifyOtp(EMAIL, code!).success, false, 'OTP is single-use')

    const { admin, client, users, profiles, calls } = fakeSupabase()
    const result = await openEmployeePortalSession(admin, client, EMAIL, EMPLOYEE)

    assert.equal(result.ok, true)
    assert.ok(result.ok && result.session.access_token)
    assert.equal(calls.signInWithPassword, 0)

    const password = users.get(EMAIL)!.password
    assert.doesNotMatch(password, /paragon/)
    assert.ok(!password.includes(EMPLOYEE.id.slice(0, 8)))
    assert.ok(password.length >= 40)

    assert.deepEqual(calls.profileInserts.map((row) => Object.keys(row).sort()), [
      ['company_id', 'employee_id', 'id', 'permissions', 'role']
    ])
    assert.equal(profiles.get(users.get(EMAIL)!.id)?.role, 'employee')
  })

  it('generates a different password every time', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => randomAuthPassword()))
    assert.equal(passwords.size, 20)
  })

  it('opens a session for an existing employee account without touching its password', async () => {
    const { admin, client, users, calls } = fakeSupabase({
      existingUser: true,
      profile: { role: 'employee', employee_id: EMPLOYEE.id }
    })

    const result = await openEmployeePortalSession(admin, client, EMAIL, EMPLOYEE)

    assert.equal(result.ok, true)
    assert.equal(users.get(EMAIL)!.password, 'chosen-by-employee')
    assert.equal(calls.profileInserts.length, 0)
  })

  it('creates the missing profile of an existing employee account', async () => {
    const { admin, client, calls } = fakeSupabase({ existingUser: true })

    const result = await openEmployeePortalSession(admin, client, EMAIL, EMPLOYEE)

    assert.equal(result.ok, true)
    assert.equal(calls.profileInserts.length, 1)
    assert.equal(calls.profileInserts[0].id, 'auth-existing')
  })

  it('refuses to open an admin account that shares the employee email', async () => {
    const { admin, client } = fakeSupabase({
      existingUser: true,
      profile: { role: 'company_admin', employee_id: null }
    })

    const result = await openEmployeePortalSession(admin, client, EMAIL, EMPLOYEE)

    assert.deepEqual(result, { ok: false, status: 403, error: EMPLOYEE_PORTAL_NOT_EMPLOYEE_ACCOUNT })
  })

  it('refuses a profile that belongs to another employee', async () => {
    const { admin, client } = fakeSupabase({
      existingUser: true,
      profile: { role: 'employee', employee_id: 'another-employee' }
    })

    const result = await openEmployeePortalSession(admin, client, EMAIL, EMPLOYEE)

    assert.equal(result.ok, false)
    assert.equal(!result.ok && result.status, 403)
  })

  it('returns an error instead of a session when the profile cannot be created', async () => {
    const { admin, client } = fakeSupabase({ profileInsertError: 'column "email" does not exist' })

    const result = await openEmployeePortalSession(admin, client, EMAIL, EMPLOYEE)

    assert.equal(result.ok, false)
    assert.equal(!result.ok && result.status, 500)
  })
})

describe('Employee portal auth endpoints', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')
  const OTP_ENDPOINTS = ['pages/api/employees/auth/verify-otp.ts', 'pages/api/employees/auth/login.ts']

  for (const path of OTP_ENDPOINTS) {
    it(`${path} opens the session through openEmployeePortalSession`, () => {
      const src = read(path)
      assert.match(src, /openEmployeePortalSession\(adminSupabase,/)
      assert.doesNotMatch(src, /_paragon|signInWithPassword|createUser|listUsers/)
    })
  }

  it('no source file builds the old deterministic password', () => {
    for (const path of [...OTP_ENDPOINTS, 'pages/api/employees/invitations/accept.ts', 'lib/auth/employee-portal-session.ts']) {
      assert.doesNotMatch(read(path), /_paragon/)
    }
  })

  it('invitation accept inserts the profile without email and rolls back the auth user on failure', () => {
    const src = read('pages/api/employees/invitations/accept.ts')
    const insert = src.slice(src.indexOf(".from('user_profiles')"), src.indexOf('if (profileError)'))
    assert.doesNotMatch(insert, /email/)
    assert.match(src, /if \(profileError\) \{[\s\S]*?auth\.admin\.deleteUser\(newUser\.user\.id\)[\s\S]*?status\(500\)/)
  })
})
