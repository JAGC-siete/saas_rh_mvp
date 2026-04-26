import { NextApiRequest, NextApiResponse } from 'next'
import { isServerDiagnosticsEnabled } from '../../lib/server-diagnostics'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isServerDiagnosticsEnabled()) {
    return res.status(404).json({ error: 'Not found' })
  }

  // Check Railway-specific environment variables
  const railwayEnvCheck = {
    // Railway deployment info
    railway: {
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'Not Railway',
      RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID || 'Not set',
      RAILWAY_SERVICE_ID: process.env.RAILWAY_SERVICE_ID || 'Not set',
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    },
    
    // Supabase variables
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    
    // Values (without exposing actual secrets)
    values: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'Missing',
    },
    
    // Build-time vs Runtime check
    buildTime: {
      timestamp: new Date().toISOString(),
      buildId: process.env.BUILD_ID || 'Not set',
      vercel: process.env.VERCEL || 'Not Vercel',
      railway: process.env.RAILWAY_ENVIRONMENT || 'Not Railway',
    }
  }

  res.status(200).json(railwayEnvCheck)
}
