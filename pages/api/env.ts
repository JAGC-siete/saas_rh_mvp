import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Only return public environment variables
  const publicEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  }

  // Filter out undefined values
  const filteredEnvVars = Object.fromEntries(
    Object.entries(publicEnvVars).filter(([_, value]) => value !== undefined)
  )

  console.log('🔍 API /env endpoint called, returning:', {
    NEXT_PUBLIC_SUPABASE_URL: filteredEnvVars.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: filteredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SITE_URL: filteredEnvVars.NEXT_PUBLIC_SITE_URL ? '✅ Set' : '❌ Missing',
  })

  res.status(200).json(filteredEnvVars)
}