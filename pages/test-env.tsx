import { useEffect, useState } from 'react'

export default function TestEnv() {
  const [envVars, setEnvVars] = useState<any>({})

  useEffect(() => {
    // Check environment variables in browser
    const vars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV
    }
    
    console.log('🔍 Environment variables in browser:', vars)
    setEnvVars(vars)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Browser Environment Variables:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Status:</h2>
          <div className="mt-2 space-y-2">
            <div>
              NEXT_PUBLIC_SUPABASE_URL: 
              <span className={envVars.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                {envVars.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div>
              NEXT_PUBLIC_SUPABASE_ANON_KEY: 
              <span className={envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                {envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Test Supabase Client:</h2>
          <button 
            onClick={async () => {
              try {
                const { createClient } = await import('@supabase/supabase-js')
                const supabase = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )
                console.log('✅ Supabase client created successfully')
                alert('✅ Supabase client created successfully!')
              } catch (error) {
                console.error('❌ Error creating Supabase client:', error)
                alert(`❌ Error: ${error}`)
              }
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Supabase Client
          </button>
        </div>
      </div>
    </div>
  )
} 