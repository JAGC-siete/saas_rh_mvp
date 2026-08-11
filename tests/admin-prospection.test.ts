import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_OUTREACH_BODY,
  DEFAULT_OUTREACH_SUBJECT,
  MAX_PROSPECTION_SEND_BATCH,
  contactAlreadySent,
  isRateLimitError,
  isStuckSending,
  normalizeImportContact,
  normalizeProspectEmail,
  parseRubrosInput,
  renderOutreachBody,
} from '../lib/admin/prospection'

describe('b2b prospection helpers', () => {
  it('normalizeProspectEmail rejects sin_dato, blanks, and weak emails', () => {
    assert.equal(normalizeProspectEmail(null), null)
    assert.equal(normalizeProspectEmail(''), null)
    assert.equal(normalizeProspectEmail('sin_dato'), null)
    assert.equal(normalizeProspectEmail('not-an-email'), null)
    assert.equal(normalizeProspectEmail('a@b'), null)
    assert.equal(normalizeProspectEmail('  ventas@cfsumar.com '), 'ventas@cfsumar.com')
  })

  it('renderOutreachBody sustituye {{ciudad}}', () => {
    const body = renderOutreachBody(DEFAULT_OUTREACH_BODY, 'Comayagua')
    assert.match(body, /comercios en Comayagua/)
    assert.doesNotMatch(body, /\{\{ciudad\}\}/)
  })

  it('default subject is the outreach subject', () => {
    assert.equal(DEFAULT_OUTREACH_SUBJECT, '¿Problemas de recursos humanos?')
  })

  it('parseRubrosInput accepts string and array', () => {
    assert.deepEqual(parseRubrosInput('a, b; c'), ['a', 'b', 'c'])
    assert.deepEqual(parseRubrosInput(['x', ' y ']), ['x', 'y'])
  })

  it('normalizeImportContact requires comercio and dedupe-ready email', () => {
    assert.equal(normalizeImportContact({ email: 'a@b.com' }), null)
    const row = normalizeImportContact({
      comercio: 'Sumar',
      email: ' Ventas@CFSumar.com ',
      confianza: 'alta',
    })
    assert.ok(row)
    assert.equal(row!.email_normalized, 'ventas@cfsumar.com')
    assert.equal(row!.confianza, 'alta')
  })

  it('contactAlreadySent detects prior live sends', () => {
    assert.equal(
      contactAlreadySent(
        [
          { contact_id: 'a', status: 'dry_run' },
          { contact_id: 'b', status: 'sent' },
        ],
        'b'
      ),
      true
    )
    assert.equal(contactAlreadySent([{ contact_id: 'a', status: 'dry_run' }], 'a'), false)
  })

  it('isRateLimitError detects 429-like messages', () => {
    assert.equal(isRateLimitError('Rate limit exceeded'), true)
    assert.equal(isRateLimitError('Error (429)'), true)
    assert.equal(isRateLimitError('invalid api key'), false)
  })

  it('isStuckSending after 5 minutes', () => {
    const now = Date.parse('2026-08-11T12:00:00.000Z')
    assert.equal(
      isStuckSending(
        { status: 'sending', updated_at: '2026-08-11T11:50:00.000Z' },
        now
      ),
      true
    )
    assert.equal(
      isStuckSending(
        { status: 'sending', updated_at: '2026-08-11T11:58:00.000Z' },
        now
      ),
      false
    )
    assert.equal(
      isStuckSending({ status: 'ready', updated_at: '2026-08-11T11:00:00.000Z' }, now),
      false
    )
  })

  it('batch cap is 20', () => {
    assert.equal(MAX_PROSPECTION_SEND_BATCH, 20)
  })
})
