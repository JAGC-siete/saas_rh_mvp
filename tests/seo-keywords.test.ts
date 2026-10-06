import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { COUNTRY_KEYWORDS, ROUTE_KEYWORDS, keywordsForPath } from '../lib/seo/keywords'

describe('SEO keyword map', () => {
  it('uses planilla for HN/SV/GT and nómina for reserved MX/CO', () => {
    for (const c of ['HND', 'SLV', 'GTM'] as const) {
      assert.equal(COUNTRY_KEYWORDS[c].primaryTerm, 'planilla')
      assert.equal(COUNTRY_KEYWORDS[c].status, 'active')
    }
    for (const c of ['MEX', 'COL'] as const) {
      assert.equal(COUNTRY_KEYWORDS[c].primaryTerm, 'nómina')
      assert.equal(COUNTRY_KEYWORDS[c].status, 'reserved')
    }
  })

  it('has one well-formed entry per route, only for active countries', () => {
    const paths = ROUTE_KEYWORDS.map((r) => r.path)
    assert.equal(new Set(paths).size, paths.length, 'duplicate path')
    for (const r of ROUTE_KEYWORDS) {
      assert.match(r.path, /^\/[a-z0-9\-/]*$/, r.path)
      assert.equal(COUNTRY_KEYWORDS[r.country].status, 'active', `${r.path} targets a reserved country`)
      assert.ok(r.primary.trim().length > 0, `${r.path} has no primary`)
      assert.ok(r.targets.length > 0, `${r.path} has no targets`)
    }
  })

  it('keeps brand, operator and numeric noise out of targets', () => {
    for (const r of ROUTE_KEYWORDS) {
      for (const t of r.targets) {
        assert.equal(t.query, t.query.toLowerCase(), t.query)
        assert.doesNotMatch(t.query, /-site:|sisu|^\d+$/, t.query)
        assert.ok(t.impressions >= 0)
        assert.ok(t.position === null || t.position >= 1)
      }
    }
  })

  it('looks up a route by path', () => {
    assert.equal(keywordsForPath('/calculadora-deducciones')?.country, 'HND')
    assert.equal(keywordsForPath('/no-existe'), undefined)
  })
})
