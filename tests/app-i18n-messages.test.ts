import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import es from '../lib/i18n/app/messages/es.json'
import en from '../lib/i18n/app/messages/en.json'

function leafKeys(obj: Record<string, unknown>, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>()
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') {
      for (const [ck, cv] of leafKeys(v as Record<string, unknown>, key)) out.set(ck, cv)
    } else {
      out.set(key, v)
    }
  }
  return out
}

function placeholders(message: string): string[] {
  // `{name}` or `{count, plural, ...}`; words inside plural branches (`{Hace # minuto}`) are not arguments.
  return [...message.matchAll(/\{(\w+)\s*(?=[,}])/g)].map((m) => m[1]).sort()
}

describe('app i18n messages', () => {
  const esKeys = leafKeys(es)
  const enKeys = leafKeys(en)

  it('has the same keys in es and en', () => {
    assert.deepEqual([...enKeys.keys()].sort(), [...esKeys.keys()].sort())
  })

  it('has no empty or non-string messages', () => {
    for (const [locale, keys] of [['es', esKeys], ['en', enKeys]] as const) {
      for (const [key, value] of keys) {
        assert.ok(typeof value === 'string' && value.trim() !== '', `${locale}: ${key} is empty`)
      }
    }
  })

  it('uses the same ICU placeholders in both languages', () => {
    for (const [key, value] of esKeys) {
      const other = enKeys.get(key)
      if (typeof value !== 'string' || typeof other !== 'string') continue
      assert.deepEqual(placeholders(other), placeholders(value), `placeholder mismatch in ${key}`)
    }
  })
})
