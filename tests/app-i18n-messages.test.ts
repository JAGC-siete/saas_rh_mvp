import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser'
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

/** ICU argument names (`{name}`, `{count, plural, ...}`), walking into plural/select branches and rich tags. */
function placeholders(message: string): string[] {
  const names = new Set<string>()
  const walk = (els: MessageFormatElement[]) => {
    for (const el of els) {
      if (el.type === TYPE.literal || el.type === TYPE.pound) continue
      if (el.type === TYPE.tag) {
        names.add(`<${el.value}>`)
        walk(el.children)
        continue
      }
      names.add(el.value)
      if (el.type === TYPE.plural || el.type === TYPE.select) {
        for (const opt of Object.values(el.options)) walk(opt.value)
      }
    }
  }
  walk(parse(message, { ignoreTag: false }))
  return [...names].sort()
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
