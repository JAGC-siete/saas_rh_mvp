import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  realtime: {
    connected: boolean
    latency?: number
    error?: string
  }
  timestamp: string
  uptime: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  
  try {
    const supabase = createClient(req, res)
    
    // Test basic Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('employee_scores')
      .select('count')
      .limit(1)

    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`)
    }

    // Test realtime connection
    const channel = supabase.channel('health_check')
    const realtimeStartTime = Date.now()
    
    const realtimeTest = await new Promise<{ connected: boolean; latency: number; error?: string }>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ connected: false, latency: Date.now() - realtimeStartTime, error: 'Timeout' })
      }, 5000) // 5 second timeout

      channel.subscribe((status, err) => {
        clearTimeout(timeout)
        
        if (status === 'SUBSCRIBED') {
          resolve({ 
            connected: true, 
            latency: Date.now() - realtimeStartTime 
          })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resolve({ 
            connected: false, 
            latency: Date.now() - realtimeStartTime,
            error: err?.message || 'Channel error'
          })
        } else {
          resolve({ 
            connected: false, 
            latency: Date.now() - realtimeStartTime,
            error: `Unexpected status: ${status}`
          })
        }
      })
    })

    // Clean up the test channel
    supabase.removeChannel(channel)

    const response: HealthCheckResponse = {
      status: realtimeTest.connected ? 'healthy' : 'unhealthy',
      realtime: {
        connected: realtimeTest.connected,
        latency: realtimeTest.latency,
        error: realtimeTest.error
      },
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime
    }

    const statusCode = realtimeTest.connected ? 200 : 503
    res.status(statusCode).json(response)

  } catch (error) {
    console.error('Health check error:', error)
    
    const response: HealthCheckResponse = {
      status: 'unhealthy',
      realtime: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime
    }

    res.status(503).json(response)
  }
}
