/**
 * Parse frontmatter and body from Markdown files.
 */

import matter from 'gray-matter'
import { marked } from 'marked'

/** Parse raw markdown string into frontmatter data and body. */
export function parseFrontmatter(raw: string): matter.GrayMatterFile<string> {
  return matter(raw)
}

/** Convert markdown body to HTML. */
export function markdownToHtml(markdown: string): string {
  return marked(markdown, { async: false })
}
