import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  collectLandingMediaPaths,
  landingMediaObjectNamesToDelete,
  landingMediaObjectPath,
  landingMediaPathFromPublicUrl,
} from '../lib/landings/media'

const LANDING = '292f1b4d-4a7c-4bf2-978a-040aacdeb600'
const FILE = '6f1c2a40-7b2e-4c1a-9d33-0a1b2c3d4e5f'
const PUBLIC = `https://example.supabase.co/storage/v1/object/public/landing-pages/${LANDING}/${FILE}.jpg`

describe('fotos de landing', () => {
  it('arma una ruta única dentro de la página', () => {
    assert.equal(landingMediaObjectPath(LANDING, 'image/png', FILE), `${LANDING}/${FILE}.png`)
  })

  it('reconoce solo la URL pública de esa página', () => {
    assert.equal(landingMediaPathFromPublicUrl(PUBLIC, LANDING), `${LANDING}/${FILE}.jpg`)
    assert.equal(landingMediaPathFromPublicUrl('https://cdn.example/foto.jpg', LANDING), null)
    assert.equal(
      landingMediaPathFromPublicUrl(PUBLIC, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      null
    )
    assert.equal(
      landingMediaPathFromPublicUrl(
        `https://example.supabase.co/storage/v1/object/public/other-bucket/${LANDING}/${FILE}.jpg`,
        LANDING
      ),
      null
    )
  })

  it('junta las fotos que el JSON todavía cita', () => {
    const paths = collectLandingMediaPaths(
      {
        meta: { ogImageUrl: PUBLIC },
        blocks: [{ imageUrl: PUBLIC }, { items: [{ imageUrl: 'https://otro.example/a.jpg' }] }],
      },
      LANDING
    )
    assert.deepEqual([...paths], [`${LANDING}/${FILE}.jpg`])
  })

  it('borra lo que ya no está en el borrador ni en lo publicado', () => {
    const keep = collectLandingMediaPaths({ blocks: [{ imageUrl: PUBLIC }] }, LANDING)
    const orphan = '11111111-1111-4111-8111-111111111111.jpg'
    assert.deepEqual(landingMediaObjectNamesToDelete([`${FILE}.jpg`, orphan, 'nota.txt'], keep), [orphan])
  })
})
