import { useState, useEffect } from 'react'
import Head from 'next/head'

interface RailwayEnvData {
  railway: {
    RAILWAY_ENVIRONMENT: string
    RAILWAY_PROJECT_ID: string
    RAILWAY_SERVICE_ID: string
    NODE_ENV: string
    PORT: string
  }
  supabase: {
    NEXT_PUBLIC_SUPABASE_URL: boolean
    NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean
    SUPABASE_SERVICE_ROLE_KEY: boolean
  }
  values: {
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  }
  buildTime: {
    timestamp: string
    buildId: string
    vercel: string
    railway: string
  }
}

export default function RailwayDebug() {
  const [envData, setEnvData] = useState<RailwayEnvData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEnvData = async () => {
      try {
        const response = await fetch('/api/railway-env-check')
        if (response.ok) {
          const data = await response.json()
          setEnvData(data)
        } else {
          setError('Failed to fetch environment data')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchEnvData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Railway environment data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Railway Environment Debug</title>
        <meta name="description" content="Debug Railway environment variables" />
      </Head>

      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Railway Environment Debug</h1>
          
          {envData && (
            <div className="space-y-6">
              {/* Railway Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🚂 Railway Deployment Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Environment:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      envData.railway.RAILWAY_ENVIRONMENT === 'production' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {envData.railway.RAILWAY_ENVIRONMENT}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Project ID:</span>
                    <span className="ml-2 text-gray-600">{envData.railway.RAILWAY_PROJECT_ID}</span>
                  </div>
                  <div>
                    <span className="font-medium">Service ID:</span>
                    <span className="ml-2 text-gray-600">{envData.railway.RAILWAY_SERVICE_ID}</span>
                  </div>
                  <div>
                    <span className="font-medium">Node ENV:</span>
                    <span className="ml-2 text-gray-600">{envData.railway.NODE_ENV}</span>
                  </div>
                  <div>
                    <span className="font-medium">Port:</span>
                    <span className="ml-2 text-gray-600">{envData.railway.PORT}</span>
                  </div>
                </div>
              </div>

              {/* Supabase Variables */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🗄️ Supabase Variables</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      envData.supabase.NEXT_PUBLIC_SUPABASE_URL 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {envData.supabase.NEXT_PUBLIC_SUPABASE_URL ? '✅ Available' : '❌ Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      envData.supabase.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {envData.supabase.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Available' : '❌ Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">SUPABASE_SERVICE_ROLE_KEY:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      envData.supabase.SUPABASE_SERVICE_ROLE_KEY 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {envData.supabase.SUPABASE_SERVICE_ROLE_KEY ? '✅ Available' : '❌ Missing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Values Preview */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🔍 Values Preview</h2>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</span>
                    <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {envData.values.NEXT_PUBLIC_SUPABASE_URL}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                    <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {envData.values.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                    </span>
                  </div>
                </div>
              </div>

              {/* Build Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🏗️ Build Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Build Time:</span>
                    <span className="ml-2 text-gray-600">{new Date(envData.buildTime.timestamp).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Build ID:</span>
                    <span className="ml-2 text-gray-600">{envData.buildTime.buildId}</span>
                  </div>
                  <div>
                    <span className="font-medium">Platform:</span>
                    <span className="ml-2 text-gray-600">
                      {envData.buildTime.railway !== 'Not Railway' ? 'Railway' : 
                       envData.buildTime.vercel !== 'Not Vercel' ? 'Vercel' : 'Other'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client-side Check */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🌐 Client-side Variables</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL (client):</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Available' : '❌ Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY (client):</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Available' : '❌ Missing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
