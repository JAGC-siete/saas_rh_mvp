import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface LoginRequest {
  email: string
  code?: string // Optional for step 2 (OTP verification)
}

interface LoginResponse {
  success: boolean
  step?: 'send_code' | 'verify_code'
  message?: string
  user?: any
  session?: any
  employee?: {
    id: string
    name: string
    dni_masked: string
    role: string
    department?: string
  }
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { email, code }: LoginRequest = req.body

    // Input validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      })
    }

    const supabase = createClient(req, res)
    
    // Step 1: Send OTP code to email (if no code provided)
    if (!code) {
      // Delegate to send-otp endpoint
      const otpResponse = await fetch(`${req.headers.host}/api/employees/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const otpData = await otpResponse.json()
      
      return res.status(otpResponse.status).json({
        success: otpData.success,
        step: 'send_code',
        message: otpData.message,
        error: otpData.error
      })
    }

    // Step 2: Verify OTP code using custom endpoint
    const verifyResponse = await fetch(`${req.headers.host}/api/employees/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    })

    const verifyData = await verifyResponse.json()
    
    if (!verifyResponse.ok || !verifyData.success) {
      return res.status(verifyResponse.status).json({
        success: false,
        error: verifyData.error
      })
    }

    // Copy session cookies from verify response
    const cookies = verifyResponse.headers.get('set-cookie')
    if (cookies) {
      res.setHeader('Set-Cookie', cookies)
    }

    return res.status(200).json({
      success: true,
      step: 'verify_code',
      user: verifyData.user,
      session: verifyData.session,
      employee: verifyData.employee
    })

  } catch (error) {
    logger.error('Employee login error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
