import { NextApiRequest, NextApiResponse } from 'next'
import { logoutEmployee, getEmployeeSessionInfo } from '../../../../lib/auth/employee-auth'
import { logger } from '../../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get session token from Authorization header or cookie
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.cookies.employee_session_token

    if (!sessionToken) {
      return res.status(400).json({ error: 'Token de sesión requerido' })
    }

    // Get session info for logging before logout
    const sessionInfo = await getEmployeeSessionInfo(sessionToken)
    
    // Perform logout
    await logoutEmployee(sessionToken)

    // Log successful logout
    logger.info('Employee logout successful', {
      employeeId: sessionInfo?.employeeId,
      employeeName: sessionInfo?.employeeName,
      sessionTokenPrefix: sessionToken.substring(0, 8) + '...'
    })

    return res.status(200).json({ 
      success: true,
      message: 'Sesión cerrada exitosamente' 
    })

  } catch (error) {
    logger.error('Employee logout error', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    })
  }
}
