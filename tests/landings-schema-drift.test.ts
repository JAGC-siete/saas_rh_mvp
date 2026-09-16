/**
 * Guardia de deriva entre la tabla real y el tipado del módulo de landings.
 *
 * Qué detecta:
 *  - alguien agrega o quita una columna sin actualizar types/landing.ts y lib/landings/db.ts
 *  - alguien amplía el GRANT del rol anon y expone el borrador o el correo de avisos
 *
 * Necesita credenciales; sin ellas los casos se saltan para no romper `npm test` en local.
 * En CI: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  LANDING_LEADS_TABLE,
  LANDING_LEAD_COLUMN_NAMES,
  LANDING_PAGES_TABLE,
  LANDING_PAGE_ANON_COLUMN_NAMES,
  LANDING_PAGE_COLUMN_NAMES,
  LANDING_PAGE_PRIVATE_COLUMN_NAMES,
} from '../lib/landings/db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

const hasServiceCreds = Boolean(SUPABASE_URL?.startsWith('http') && SERVICE_KEY)
const hasAnonCreds = Boolean(SUPABASE_URL?.startsWith('http') && ANON_KEY)
const SKIP_SERVICE = 'sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'
const SKIP_ANON = 'sin NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'

function restHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}` }
}

/** Lee una sola columna. 200 = legible; 4xx = la base la niega o no existe. */
async function probeColumn(key: string, table: string, column: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=1`, {
    headers: restHeaders(key),
  })
  const body = res.ok ? '' : await res.text()
  return { status: res.status, body }
}

async function fetchColumnsFromOpenApi(key: string, table: string): Promise<string[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { ...restHeaders(key), Accept: 'application/openapi+json' },
  })
  assert.equal(res.ok, true, `El documento OpenAPI de PostgREST respondió ${res.status}`)

  const doc = (await res.json()) as { definitions?: Record<string, { properties?: Record<string, unknown> }> }
  const definition = doc.definitions?.[table]
  assert.ok(
    definition?.properties,
    `PostgREST no describe la tabla ${table}. Revisa que siga expuesta en el esquema public.`
  )
  return Object.keys(definition.properties as Record<string, unknown>)
}

describe('landings: deriva entre esquema y tipos', () => {
  it(
    'las columnas de landing_pages coinciden con LANDING_PAGE_COLUMN_NAMES',
    { skip: hasServiceCreds ? false : SKIP_SERVICE },
    async () => {
      const real = await fetchColumnsFromOpenApi(SERVICE_KEY!, LANDING_PAGES_TABLE)
      const esperadas = [...LANDING_PAGE_COLUMN_NAMES]

      const faltantesEnTipo = real.filter((c) => !esperadas.includes(c as never))
      const sobrantesEnTipo = esperadas.filter((c) => !real.includes(c))

      assert.deepEqual(
        faltantesEnTipo,
        [],
        `La base tiene columnas que el tipo no conoce. Actualiza types/landing.ts y lib/landings/db.ts: ${faltantesEnTipo.join(', ')}`
      )
      assert.deepEqual(
        sobrantesEnTipo,
        [],
        `El tipo declara columnas que ya no existen en la base: ${sobrantesEnTipo.join(', ')}`
      )
    }
  )

  it(
    'las columnas de landing_leads coinciden con LANDING_LEAD_COLUMN_NAMES',
    { skip: hasServiceCreds ? false : SKIP_SERVICE },
    async () => {
      const real = await fetchColumnsFromOpenApi(SERVICE_KEY!, LANDING_LEADS_TABLE)
      assert.deepEqual(
        [...real].sort(),
        [...LANDING_LEAD_COLUMN_NAMES].sort(),
        'landing_leads cambió: sincroniza types/landing.ts y lib/landings/db.ts'
      )
    }
  )
})

describe('landings: superficie pública del rol anon', () => {
  it(
    'anon puede leer las columnas publicadas',
    { skip: hasAnonCreds ? false : SKIP_ANON },
    async () => {
      for (const column of LANDING_PAGE_ANON_COLUMN_NAMES) {
        const { status, body } = await probeColumn(ANON_KEY!, LANDING_PAGES_TABLE, column)
        assert.equal(
          status,
          200,
          `anon debería poder leer ${column} y recibió ${status}. Revisa el GRANT por columna. ${body}`
        )
      }
    }
  )

  it(
    'anon NO puede leer el borrador ni los datos internos',
    { skip: hasAnonCreds ? false : SKIP_ANON },
    async () => {
      for (const column of LANDING_PAGE_PRIVATE_COLUMN_NAMES) {
        const { status } = await probeColumn(ANON_KEY!, LANDING_PAGES_TABLE, column)
        assert.notEqual(
          status,
          200,
          `FUGA: anon puede leer landing_pages.${column}. Revoca ese GRANT por columna.`
        )
      }
    }
  )

  it(
    'anon no tiene acceso a landing_leads',
    { skip: hasAnonCreds ? false : SKIP_ANON },
    async () => {
      const { status } = await probeColumn(ANON_KEY!, LANDING_LEADS_TABLE, 'id')
      assert.notEqual(status, 200, 'FUGA: anon puede leer landing_leads.')
    }
  )
})
