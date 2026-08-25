import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { parseXmlRpcMethodResponse, xmlRpcAuthenticate } from '../lib/integrations/odoo/xmlrpc-client'
import { encryptOdooSecret, decryptOdooSecret, capOdooKeyExpiry } from '../lib/integrations/odoo/crypto'
import { mapSisuLinesToOdooPayload } from '../lib/integrations/odoo/journal-payload'
import { createOdooTransport } from '../lib/integrations/odoo/factory'
import { createJson2Client } from '../lib/integrations/odoo/json2-client'
import {
  OdooTransportError,
  isRetryableStatus,
  sanitizeOdooErrorMessage,
  type DecryptedOdooConnection,
} from '../lib/integrations/odoo/types'
import { canManageOdooIntegration } from '../lib/integrations/odoo/access'
import { employeeSyncFieldsChanged } from '../lib/integrations/odoo/employee-sync-fields'

function conn(partial: Partial<DecryptedOdooConnection> = {}): DecryptedOdooConnection {
  return {
    id: 'c1',
    companyId: 'co1',
    baseUrl: 'https://odoo.example.test',
    databaseName: 'db1',
    odooVersion: '19.0',
    odooCompanyId: 1,
    journalCode: 'NOM',
    odooLogin: 'bot',
    apiKey: 'test-api-key',
    enabled: true,
    keyExpiresAt: null,
    ...partial,
  }
}

describe('odoo crypto', () => {
  it('roundtrips AES-GCM ciphertext', () => {
    process.env.ODOO_SECRETS_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const stored = encryptOdooSecret('odoo-api-key-value')
    assert.equal(stored.startsWith('v1:'), true)
    assert.equal(decryptOdooSecret(stored), 'odoo-api-key-value')
    assert.equal(stored.includes('odoo-api-key-value'), false)
  })
})

describe('odoo error classification', () => {
  it('treats 4xx as dead-letter and 5xx/network as retry', () => {
    assert.equal(isRetryableStatus(400), false)
    assert.equal(isRetryableStatus(401), false)
    assert.equal(isRetryableStatus(404), false)
    assert.equal(isRetryableStatus(429), true)
    assert.equal(isRetryableStatus(500), true)
    assert.equal(isRetryableStatus(503), true)
    assert.equal(isRetryableStatus(0), true)
  })

  it('redacts bearer tokens from error text', () => {
    const msg = sanitizeOdooErrorMessage('Authorization bearer supersecretkey123 failed')
    assert.equal(msg.includes('supersecretkey123'), false)
    assert.equal(msg.includes('[redacted]'), true)
  })
})

describe('odoo json2 client', () => {
  it('maps HTTP 400 to non-retryable transport error', async () => {
    const client = createJson2Client({
      baseUrl: 'https://odoo.example.test',
      apiKey: 'test-api-key',
      fetchImpl: async () =>
        new Response(JSON.stringify({ message: 'Account code 999 not found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    })
    await assert.rejects(
      () => client.call('humano.sisu.bridge', 'import_payroll_move', { vals: {} }),
      (err: unknown) => {
        assert.equal(err instanceof OdooTransportError, true)
        const te = err as OdooTransportError
        assert.equal(te.statusCode, 400)
        assert.equal(te.retryable, false)
        assert.equal(te.message.includes('999'), true)
        return true
      }
    )
  })

  it('maps HTTP 503 to retryable transport error', async () => {
    const client = createJson2Client({
      baseUrl: 'https://odoo.example.test',
      apiKey: 'test-api-key',
      fetchImpl: async () => new Response('unavailable', { status: 503 }),
    })
    await assert.rejects(
      () => client.call('res.users', 'context_get', {}),
      (err: unknown) => {
        assert.equal(err instanceof OdooTransportError, true)
        const te = err as OdooTransportError
        assert.equal(te.statusCode, 503)
        assert.equal(te.retryable, true)
        return true
      }
    )
  })
})

describe('odoo factory', () => {
  it('uses JSON-2 for 19.0', async () => {
    let url = ''
    const transport = createOdooTransport(
      conn({ odooVersion: '19.0' }),
      async (input) => {
        url = String(input)
        return new Response(JSON.stringify({ uid: 2 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    )
    const result = await transport.call('res.users', 'context_get', {})
    assert.equal(url.includes('/json/2/res.users/context_get'), true)
    assert.deepEqual(result, { uid: 2 })
  })

  it('requires login and database for 18.0 XML-RPC', () => {
    assert.throws(
      () => createOdooTransport(conn({ odooVersion: '18.0', odooLogin: null })),
      (err: unknown) => err instanceof OdooTransportError && (err as OdooTransportError).retryable === false
    )
  })

  it('uses XML-RPC object execute_kw for 18.0', async () => {
    const xmlInt = `<?xml version="1.0"?><methodResponse><params><param><value><int>7</int></value></param></params></methodResponse>`
    const xmlStruct = `<?xml version="1.0"?><methodResponse><params><param><value><struct><member><name>odoo_id</name><value><int>15</int></value></member></struct></value></param></params></methodResponse>`
    let calls = 0
    const transport = createOdooTransport(
      conn({ odooVersion: '18.0' }),
      async (input) => {
        calls += 1
        const url = String(input)
        if (url.includes('/xmlrpc/2/common')) {
          return new Response(xmlInt, { status: 200, headers: { 'Content-Type': 'text/xml' } })
        }
        return new Response(xmlStruct, { status: 200, headers: { 'Content-Type': 'text/xml' } })
      }
    )
    const result = await transport.call('humano.sisu.bridge', 'upsert_employee', {
      vals: { sisu_id: 'e1', name: 'Ana' },
    })
    assert.equal(calls, 2)
    assert.deepEqual(result, { odoo_id: 15 })
  })
})

describe('odoo xmlrpc authenticate', () => {
  it('returns uid from common.authenticate', async () => {
    const uid = await xmlRpcAuthenticate({
      baseUrl: 'https://odoo.example.test',
      apiKey: 'test-api-key',
      databaseName: 'db1',
      login: 'bot',
      fetchImpl: async () =>
        new Response(
          `<?xml version="1.0"?><methodResponse><params><param><value><int>4</int></value></param></params></methodResponse>`,
          { status: 200, headers: { 'Content-Type': 'text/xml' } }
        ),
    })
    assert.equal(uid, 4)
  })
})

describe('odoo access and employee allowlist', () => {
  it('allows payroll nav roles and can_manage_payroll', () => {
    assert.equal(canManageOdooIntegration('super_admin'), true)
    assert.equal(canManageOdooIntegration('hr_manager'), true)
    assert.equal(canManageOdooIntegration('manager', {}), false)
  })

  it('detects employee sync field changes and ignores salary', () => {
    assert.equal(
      employeeSyncFieldsChanged({ name: 'A', dni: '1', email: 'a@x', status: 'active' }, { name: 'A', dni: '1', email: 'a@x', status: 'active' }),
      false
    )
    assert.equal(
      employeeSyncFieldsChanged({ name: 'A', dni: '1', email: 'a@x', status: 'active' }, { name: 'B', dni: '1', email: 'a@x', status: 'active' }),
      true
    )
    assert.equal(
      employeeSyncFieldsChanged(
        { name: 'A', dni: '1', email: 'a@x', status: 'active', base_salary: 100 },
        { name: 'A', dni: '1', email: 'a@x', status: 'active', base_salary: 200 }
      ),
      false
    )
  })
})

describe('odoo xmlrpc nested search_read', () => {
  it('decodes an array of structs with nested value tags', () => {
    const xml = `<?xml version="1.0"?>
<methodResponse><params><param><value><array><data>
<value><struct>
<member><name>id</name><value><int>12</int></value></member>
<member><name>code</name><value><string>1101</string></value></member>
<member><name>name</name><value><string>Caja</string></value></member>
</struct></value>
<value><struct>
<member><name>id</name><value><int>13</int></value></member>
<member><name>code</name><value><string>2101</string></value></member>
<member><name>name</name><value><string>IHSS por pagar</string></value></member>
</struct></value>
</data></array></value></param></params></methodResponse>`
    const result = parseXmlRpcMethodResponse(xml)
    assert.deepEqual(result, [
      { id: 12, code: '1101', name: 'Caja' },
      { id: 13, code: '2101', name: 'IHSS por pagar' },
    ])
  })
})

describe('odoo journal payload mapping', () => {
  it('maps SISU account ids to Odoo codes and lists missing', () => {
    const accountMap = new Map([
      ['acc-cash', '1101'],
      ['acc-ihss', '2101'],
    ])
    const mapped = mapSisuLinesToOdooPayload({
      journalEntryId: 'je-1',
      date: '2026-08-25',
      ref: 'Planilla ago',
      journalCode: 'NOM',
      currency: 'HNL',
      accountMap,
      lines: [
        { account_id: 'acc-cash', debit: 0, credit: 100, name: 'Neto' },
        { account_id: 'acc-ihss', debit: 100, credit: 0, name: 'IHSS' },
      ],
    })
    assert.equal(mapped.missingAccountIds.length, 0)
    assert.equal(mapped.payload.sisu_journal_entry_id, 'je-1')
    assert.equal(mapped.payload.lines.length, 2)
    assert.equal(mapped.payload.lines[0].account_code, '1101')
    assert.equal(mapped.payload.lines[0].credit, 100)
    assert.equal(mapped.payload.lines[1].debit, 100)
  })

  it('fails fast listing unmapped SISU accounts', () => {
    const mapped = mapSisuLinesToOdooPayload({
      journalEntryId: 'je-2',
      date: '2026-08-25',
      ref: 'Planilla',
      journalCode: 'NOM',
      currency: 'HNL',
      accountMap: new Map([['acc-cash', '1101']]),
      lines: [
        { account_id: 'acc-cash', debit: 0, credit: 50 },
        { account_id: 'acc-missing', debit: 50, credit: 0 },
      ],
    })
    assert.deepEqual(mapped.missingAccountIds, ['acc-missing'])
  })
})

describe('odoo key expiry cap', () => {
  it('caps expiry to 90 days', () => {
    const far = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString()
    const capped = Date.parse(capOdooKeyExpiry(far))
    const max = Date.now() + 90 * 24 * 60 * 60 * 1000
    assert.equal(capped <= max + 1000, true)
    assert.equal(capped > Date.now() + 80 * 24 * 60 * 60 * 1000, true)
  })
})
