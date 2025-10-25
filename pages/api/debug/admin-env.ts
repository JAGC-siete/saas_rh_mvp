import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { env } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY_LENGTH: env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      NODE_ENV: env.NODE_ENV,
    }

    // Test admin client creation
    let adminClientTest: { success: boolean; error: string | null } = { success: false, error: null }
    try {
      const supabase = createAdminClient()
      adminClientTest = { success: true, error: null }
    } catch (error) {
      adminClientTest = { success: false, error: error instanceof Error ? error.message : String(error) }
    }

    // Test basic database query
    let dbTest: { success: boolean; error: string | null; data: any } = { success: false, error: null, data: null }
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .limit(1)
      
      if (error) {
        dbTest = { success: false, error: error.message, data: null }
      } else {
        dbTest = { success: true, error: null, data: data }
      }
    } catch (error) {
      dbTest = { success: false, error: error instanceof Error ? error.message : String(error), data: null }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      adminClientTest,
      databaseTest: dbTest,
      processEnv: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
