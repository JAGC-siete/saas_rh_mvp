import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BILINGUAL_LANDING_PATHS } from '../lib/i18n/bilingual-paths'

const EN_PAGES_DIR = join(__dirname, '..', 'pages', 'en')

function enPageFile(path: string): string {
  return join(EN_PAGES_DIR, path === '/' ? 'index.tsx' : `${path.slice(1)}.tsx`)
}

describe('bilingual landing pages', () => {
  it('has a pages/en file for every bilingual path, so the build prerenders English HTML', () => {
    for (const path of BILINGUAL_LANDING_PATHS) {
      assert.ok(existsSync(enPageFile(path)), `missing ${enPageFile(path)} for ${path}`)
    }
  })

  it('has no pages/en file for a path without English copy', () => {
    const expected = new Set(BILINGUAL_LANDING_PATHS.map(enPageFile))
    for (const file of readdirSync(EN_PAGES_DIR)) {
      assert.ok(expected.has(join(EN_PAGES_DIR, file)), `pages/en/${file} is not in BILINGUAL_LANDING_PATHS`)
    }
  })
})
