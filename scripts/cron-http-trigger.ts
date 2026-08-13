/**
 * Railway cron entrypoint: POST a protected cron API route and exit.
 *
 * Env:
 *   CRON_ENDPOINT_URL  Full URL (e.g. https://humanosisu.net/api/cron/daily)
 *   CRON_SECRET        Bearer token
 *
 * Usage (Railway cron service start command):
 *   npx tsx scripts/cron-http-trigger.ts
 */

async function run(): Promise<void> {
  const url = process.env.CRON_ENDPOINT_URL?.trim()
  const secret = process.env.CRON_SECRET?.trim()

  if (!url || !secret) {
    console.error('Missing CRON_ENDPOINT_URL or CRON_SECRET')
    process.exit(1)
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  })

  const body = await res.text()
  console.log(`HTTP ${res.status}`, body.slice(0, 2000))

  if (!res.ok) process.exit(1)
}

run()
