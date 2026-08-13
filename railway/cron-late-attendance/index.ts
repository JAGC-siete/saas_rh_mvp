const CRON_SECRET = Bun.env.CRON_SECRET
const ENDPOINT_URL =
  Bun.env.ENDPOINT_URL ||
  `${Bun.env.TARGET_URL || 'https://humanosisu.net'}/api/cron/late-attendance-report`

async function triggerCron() {
  try {
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    const status = response.status
    const text = await response.text()

    console.log(`[${new Date().toISOString()}] Late attendance cron triggered: ${status}`)
    if (!response.ok) {
      console.error(`Error response: ${text}`)
      process.exit(1)
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Late attendance cron failed:`, error)
    process.exit(1)
  }
}

await triggerCron()
