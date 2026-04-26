/**
 * File-based adapter for /recursos content.
 * Reads Markdown files from content/recursos/*.md; frontmatter + body.
 */

import fs from 'fs'
import path from 'path'
import { parseFrontmatter, markdownToHtml } from './markdown'
import type { IRecursosAdapter, RecursoMeta, RecursoListItem } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'recursos')
const EXT = '.md'

function getSlugFromFilename(filename: string): string {
  return filename.replace(new RegExp(`\\${EXT}$`), '')
}

function readRecursosDir(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return []
  }
  return fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(EXT))
}

export const recursosAdapter: IRecursosAdapter = {
  async getAllSlugs(): Promise<{ slug: string }[]> {
    const files = readRecursosDir()
    return files.map((f) => ({ slug: getSlugFromFilename(f) }))
  },

  async getRecursoBySlug(slug: string): Promise<RecursoMeta | null> {
    const filePath = path.join(CONTENT_DIR, `${slug}${EXT}`)
    if (!fs.existsSync(filePath)) {
      return null
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = parseFrontmatter(raw)
    const d = data as Record<string, unknown>
    const title = (typeof d.title === 'string' ? d.title : null) ?? slug
    const description = (typeof d.description === 'string' ? d.description : null) ?? ''
    const datePublished = (typeof d.datePublished === 'string' ? d.datePublished : null) ?? new Date().toISOString().split('T')[0]
    const dateModified = typeof d.dateModified === 'string' ? d.dateModified : undefined
    const image = typeof d.image === 'string' ? d.image : undefined
    const author = typeof d.author === 'string' ? d.author : undefined
    const html = markdownToHtml(content)
    return {
      slug,
      title,
      description,
      content: html,
      datePublished,
      dateModified,
      image,
      author
    }
  },

  async getRecursosList(): Promise<RecursoListItem[]> {
    const files = readRecursosDir()
    const list: RecursoListItem[] = []
    for (const file of files) {
      const slug = getSlugFromFilename(file)
      const meta = await this.getRecursoBySlug(slug)
      if (meta) {
        list.push({
          slug: meta.slug,
          title: meta.title,
          description: meta.description,
          datePublished: meta.datePublished,
          dateModified: meta.dateModified,
          image: meta.image,
          author: meta.author
        })
      }
    }
    list.sort((a, b) => (b.datePublished.localeCompare(a.datePublished)))
    return list
  }
}
