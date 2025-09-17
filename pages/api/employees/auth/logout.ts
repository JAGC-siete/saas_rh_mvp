import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const supabase = createClient(req, res)
    
    // Get current user before logout
    const { data: { user } } = await supabase.auth.getUser()
    
    // Sign out using Supabase Auth
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      logger.error('Employee logout error', error)
      return res.status(500).json({
        success: false,
        error: 'Error cerrando sesión'
      })
    }

    logger.info('Employee logout successful', {
      userId: user?.id,
      employeeId: user?.user_metadata?.employee_id
    })

    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente'
    })

  } catch (error) {
    logger.error('Employee logout error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
