import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { env } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant } = req.query

    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant parameter required' })
    }

    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY_LENGTH: env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    }

    logger.info('Debug trial validation', { tenant, envCheck })

    // Test admin client
    const supabase = createAdminClient()

    // Test basic query
    const { data: testData, error: testError } = await supabase
      .from('trial_access_users')
      .select('tenant_id, is_active')
      .limit(5)

    if (testError) {
      logger.error('Admin client test failed', { error: testError })
      return res.status(500).json({
        error: 'Admin client test failed',
        details: testError,
        envCheck
      })
    }

    // Test specific tenant query
    const { data: tenantData, error: tenantError } = await supabase
      .from('trial_access_users')
      .select('*, companies!inner(id, subdomain, is_active)')
      .eq('tenant_id', tenant)
      .eq('is_active', true)
      .single()

    return res.status(200).json({
      success: true,
      tenant,
      envCheck,
      testQuery: {
        success: true,
        recordCount: testData?.length || 0,
        sampleRecords: testData?.slice(0, 3) || []
      },
      tenantQuery: {
        success: !tenantError,
        error: tenantError,
        data: tenantData,
        found: !!tenantData
      }
    })

  } catch (error) {
    logger.error('Debug trial validation error', { error })
    return res.status(500).json({
      error: 'Internal error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}




