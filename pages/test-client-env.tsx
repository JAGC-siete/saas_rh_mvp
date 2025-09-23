import { useEffect, useState } from 'react'

export default function TestClientEnv() {
  const [envStatus, setEnvStatus] = useState<any>({})
  const [directProcess, setDirectProcess] = useState<any>({})

  useEffect(() => {
    // Test direct process.env access
    const direct = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV,
      hasProcess: typeof process !== 'undefined',
      hasWindow: typeof window !== 'undefined',
    }

    // Test with string interpolation
    const interpolated = {
      supabaseUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
      supabaseKey: `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    }

    // Test with conditional
    const conditional = {
      urlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      keyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    }

    setDirectProcess(direct)
    setEnvStatus({
      direct,
      interpolated,
      conditional,
    })

    console.log('🔍 CLIENT ENV DEBUG:', {
      direct,
      interpolated,
      conditional,
    })
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Client Environment Debug Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>📱 Direct process.env Access</h2>
        <pre>{JSON.stringify(directProcess, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>🔧 All Environment Tests</h2>
        <pre>{JSON.stringify(envStatus, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>🌐 Browser Console</h2>
        <p>Check browser console for detailed logs</p>
      </div>
    </div>
  )
}
