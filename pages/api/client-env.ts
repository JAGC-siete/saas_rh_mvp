import { NextApiRequest, NextApiResponse } from 'next'

/**
 * API endpoint to expose environment variables to the client
 * This ensures NEXT_PUBLIC_ variables are available in the browser
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Expose only NEXT_PUBLIC_ variables (safe for client-side)
  const clientEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  // Log for debugging in Railway
  console.log('📋 Client env API called:', {
    hasUrl: !!clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: clientEnv.NODE_ENV
  })

  // Set cache headers to avoid unnecessary requests
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  
  res.status(200).json(clientEnv)
}
