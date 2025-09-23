import { useEffect, useState } from 'react'
import { env } from '../lib/env'

export default function DebugEnv() {
  const [clientEnv, setClientEnv] = useState<any>({})
  const [serverEnv, setServerEnv] = useState<any>({})

  useEffect(() => {
    // Check client-side environment variables
    setClientEnv({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV,
    })

    // Fetch server-side environment check
    fetch('/api/env-check')
      .then(res => res.json())
      .then(data => setServerEnv(data))
      .catch(err => console.error('Error fetching env check:', err))
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Environment Variables Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>📱 Client-Side (Browser)</h2>
        <pre>{JSON.stringify(clientEnv, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🖥️ Server-Side (API)</h2>
        <pre>{JSON.stringify(serverEnv, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔧 From lib/env.ts</h2>
        <pre>{JSON.stringify({
          NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
        }, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🌐 Window Object Check</h2>
        <pre>{JSON.stringify({
          window_available: typeof window !== 'undefined',
          process_available: typeof process !== 'undefined',
        }, null, 2)}</pre>
      </div>
    </div>
  )
}
