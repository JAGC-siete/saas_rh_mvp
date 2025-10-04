import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check environment variables in production
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'Not Railway',
      PORT: process.env.PORT,
      // Don't expose actual values for security
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    res.status(200).json({
      status: 'Environment check completed',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      recommendations: {
        missingVars: [
          ...(!envCheck.hasSupabaseUrl ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
          ...(!envCheck.hasSupabaseAnonKey ? ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] : []),
          ...(!envCheck.hasServiceRoleKey ? ['SUPABASE_SERVICE_ROLE_KEY'] : [])
        ]
      }
    })

  } catch (error) {
    console.error('Environment check error:', error)
    res.status(500).json({ 
      error: 'Failed to check environment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
