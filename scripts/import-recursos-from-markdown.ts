/**
 * One-time import: content/recursos/*.md → public.recursos (status=published).
 *
 * Usage:
 *   npx tsx scripts/import-recursos-from-markdown.ts
 *
 * Requires in .env.local (or .env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: skips slugs that already exist in the database.
 *
 * After import, set RECURSOS_SOURCE=supabase in .env.local / Railway.
 */

import fs from 'fs'
import path from 'path'
import { env } from '../lib/env'
import { createAdminClient } from '../lib/supabase/admin-client'
import { parseFrontmatter } from '../lib/recursos/markdown'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'recursos')
const EXT = '.md'

function getSlugFromFilename(filename: string): string {
  return filename.replace(new RegExp(`\\${EXT}$`), '')
}

async function main() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials.')
    console.error('   Create .env.local with:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL=...')
    console.error('   SUPABASE_SERVICE_ROLE_KEY=...')
    console.error('   (copy from .env.example or Railway variables)')
    process.exit(1)
  }

  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('No content/recursos directory found. Nothing to import.')
    return
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(EXT))
  if (files.length === 0) {
    console.log('No markdown files in content/recursos. Nothing to import.')
    return
  }

  const supabase = createAdminClient()
  let imported = 0
  let skipped = 0

  for (const file of files) {
    const slug = getSlugFromFilename(file)
    const filePath = path.join(CONTENT_DIR, file)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = parseFrontmatter(raw)
    const d = data as Record<string, unknown>

    const { data: existing } = await supabase
      .from('recursos')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      console.log(`⏭  Skip (exists): ${slug}`)
      skipped++
      continue
    }

    const title = (typeof d.title === 'string' ? d.title : null) ?? slug
    const description = (typeof d.description === 'string' ? d.description : null) ?? ''
    const datePublished =
      (typeof d.datePublished === 'string' ? d.datePublished : null) ??
      new Date().toISOString()
    const dateModified = typeof d.dateModified === 'string' ? d.dateModified : null
    const image = typeof d.image === 'string' ? d.image : null
    const author = typeof d.author === 'string' ? d.author : null

    const { error } = await supabase.from('recursos').insert({
      slug,
      title,
      description,
      content,
      date_published: datePublished,
      date_modified: dateModified,
      image,
      author,
      status: 'published',
    })

    if (error) {
      console.error(`❌ Failed to import ${slug}:`, error.message)
      process.exitCode = 1
      continue
    }

    console.log(`✅ Imported: ${slug}`)
    imported++
  }

  console.log(`\nDone. Imported: ${imported}, skipped: ${skipped}`)
  if (imported > 0) {
    console.log('\nNext step: set RECURSOS_SOURCE=supabase in your deployment environment.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
