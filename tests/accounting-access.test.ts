/**
 * Accounting API access rules (roles, export tenant scope, mapping accounts, search filter).
 * Run: npm run test:security
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canUseAccounting,
  findForeignAccountIds,
  isExportScopeValid,
  sanitizeAccountSearchTerm
} from '../lib/accounting/access-rules'

describe('canUseAccounting', () => {
  it('allows the same roles as the accounting page gate', () => {
    for (const role of ['super_admin', 'admin', 'company_admin', 'hr_manager', 'HR_Manager ']) {
      assert.equal(canUseAccounting(role), true, role)
    }
  })

  it('blocks employee, manager and unknown roles', () => {
    for (const role of ['employee', 'manager', '', null, undefined, 'accountant']) {
      assert.equal(canUseAccounting(role), false, String(role))
    }
  })
})

describe('isExportScopeValid', () => {
  const own = { id: 'a', company_id: 'c1' }
  const own2 = { id: 'b', company_id: 'c1' }
  const foreign = { id: 'x', company_id: 'c2' }

  it('accepts entries that all belong to one company', () => {
    assert.equal(isExportScopeValid(['a', 'b'], [own, own2]), true)
    assert.equal(isExportScopeValid(['a', 'a'], [own]), true)
  })

  it('rejects when a requested id was filtered out (foreign or missing)', () => {
    assert.equal(isExportScopeValid(['a', 'x'], [own]), false)
    assert.equal(isExportScopeValid([], []), false)
  })

  it('rejects mixed companies (super_admin path has no company filter)', () => {
    assert.equal(isExportScopeValid(['a', 'x'], [own, foreign]), false)
  })
})

describe('findForeignAccountIds', () => {
  it('returns ids not in the company chart', () => {
    assert.deepEqual(findForeignAccountIds(['acc1', 'other'], ['acc1']), ['other'])
  })

  it('returns empty when every id is owned', () => {
    assert.deepEqual(findForeignAccountIds(['acc1', 'acc1'], ['acc1', 'acc2']), [])
  })
})

describe('sanitizeAccountSearchTerm', () => {
  it('keeps codes, accented names and dashes', () => {
    assert.equal(sanitizeAccountSearchTerm(' 6101-01 '), '6101-01')
    assert.equal(sanitizeAccountSearchTerm('Provisión  Décimo'), 'Provisión Décimo')
  })

  it('strips PostgREST filter syntax', () => {
    assert.equal(sanitizeAccountSearchTerm('x%,company_id.neq.null'), 'xcompanyidneqnull')
    assert.equal(sanitizeAccountSearchTerm('a),or(id.not.is.null'), 'aoridnotisnull')
    assert.equal(sanitizeAccountSearchTerm('"*\\'), '')
  })

  it('caps length', () => {
    assert.equal(sanitizeAccountSearchTerm('9'.repeat(200)).length, 60)
  })
})
