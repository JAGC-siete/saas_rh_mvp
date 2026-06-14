import { logger } from '../logger'

/**
 * Fetches recent commits from GitHub to feed the "novedades" queue.
 * Requires GITHUB_TOKEN (read-only contents) and optionally GITHUB_REPO
 * ("owner/repo", defaults to the SISU repo). The production container has no
 * git history (.git is dockerignored), so we rely on the GitHub REST API.
 */

const DEFAULT_REPO = 'JAGC-siete/saas_rh_mvp'

export interface RepoCommit {
  sha: string
  shortSha: string
  /** First line of the commit message. */
  title: string
  /** Remaining lines (body), if any. */
  body: string
  type: string | null
  author: string
  date: string
  url: string
}

export class GithubConfigError extends Error {}

function parseConventionalType(title: string): string | null {
  const m = title.match(/^(\w+)(\([^)]+\))?!?:/)
  return m ? m[1].toLowerCase() : null
}

export function isGithubConfigured(): boolean {
  return !!process.env.GITHUB_TOKEN
}

export async function fetchRecentCommits(limit = 30): Promise<RepoCommit[]> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new GithubConfigError('GITHUB_TOKEN no está configurado')
  }

  const repo = (process.env.GITHUB_REPO || DEFAULT_REPO).trim()
  const branch = process.env.GITHUB_BRANCH || 'main'
  const perPage = Math.min(Math.max(limit, 1), 100)

  const url = `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sisu-communications',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.error('communications/github: fetch failed', { status: res.status, body: text.slice(0, 300) })
    throw new Error(`GitHub API ${res.status}`)
  }

  const data = (await res.json()) as Array<{
    sha: string
    html_url: string
    commit: { message: string; author?: { name?: string; date?: string } }
    author?: { login?: string } | null
  }>

  return data.map((c) => {
    const message = c.commit?.message ?? ''
    const [firstLine, ...rest] = message.split('\n')
    const title = (firstLine ?? '').trim()
    return {
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      title,
      body: rest.join('\n').trim(),
      type: parseConventionalType(title),
      author: c.commit?.author?.name ?? c.author?.login ?? 'desconocido',
      date: c.commit?.author?.date ?? '',
      url: c.html_url,
    }
  })
}
