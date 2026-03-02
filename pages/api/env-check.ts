import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check environment variables - only booleans and status strings, no secrets
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasSupabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  const environment = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: hasSupabaseUrl ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasSupabaseAnonKey ? '✅ Set' : '❌ Missing',
    SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey ? '✅ Set' : '❌ Missing',
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'Not Railway',
    PORT: process.env.PORT,
    hasSupabaseUrl,
    hasSupabaseAnonKey,
    hasServiceRoleKey,
  }

  res.status(200).json({
    status: 'Environment check completed',
    timestamp: new Date().toISOString(),
    environment,
    server: {
      NEXT_PUBLIC_SUPABASE_URL: hasSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasSupabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey,
    },
  })
}
