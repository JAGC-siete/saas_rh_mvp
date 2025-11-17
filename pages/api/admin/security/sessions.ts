import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createSecureErrorResponse } from '../../../../lib/security/error-handling'

interface SessionsResponse {
  success: boolean
  data?: any[]
  metadata?: {
    total: number
    page: number
    pageSize: number
    filters?: any
  }
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionsResponse>
) {
  try {
    // Verify super admin
    const { user } = await requireSuperAdmin(req, res)

    switch (req.method) {
      case 'GET':
        return await getSessions(req, res)
      case 'DELETE':
        return await revokeSession(req, res, user.id)
      default:
        res.setHeader('Allow', ['GET', 'DELETE'])
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          message: `Method ${req.method} not allowed`
        })
    }
  } catch (error: any) {
    // If error from requireSuperAdmin, it already sent response
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in sessions admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getSessions(req: NextApiRequest, res: NextApiResponse<SessionsResponse>) {
  try {
    const adminClient = createAdminClient()

    // Query params for filtering
    const userId = req.query.user_id as string | undefined
    const search = req.query.search as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Get sessions from auth.sessions (Supabase native table)
    // Note: auth.sessions requires admin access
    const { data: authSessions, error: sessionsError } = await adminClient
      .from('auth.sessions')
      .select('id, user_id, created_at, updated_at, ip, user_agent, refreshed_at, not_after')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (sessionsError) {
      // If auth.sessions doesn't work, try alternative approach
      logger.warn('Failed to query auth.sessions directly, using admin API', { error: sessionsError })
      
      // Get all users and their sessions via admin API
      const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })

      if (usersError) throw usersError

      // Build sessions list from user data
      const sessions: any[] = []
      
      for (const user of users || []) {
        if (user.last_sign_in_at) {
          // Filter by userId if provided
          if (userId && user.id !== userId) continue
          
          // Filter by email search if provided
          if (search && !user.email?.toLowerCase().includes(search.toLowerCase())) continue

          sessions.push({
            id: user.id, // Using user id as session identifier
            user_id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            ip: null,
            user_agent: null
          })
        }
      }

      // Apply pagination
      const paginatedSessions = sessions.slice(from, to + 1)
      const total = sessions.length

      logger.info('Sessions retrieved via admin API', {
        count: paginatedSessions.length,
        total
      })

      return res.status(200).json({
        success: true,
        data: paginatedSessions,
        metadata: {
          total,
          page,
          pageSize,
          filters: {
            user_id: userId || null,
            search: search || null
          }
        }
      })
    }

    // Get user emails for the sessions
    const userIds = authSessions ? [...new Set(authSessions.map((s: any) => s.user_id).filter(Boolean))] : []
    const usersMap = new Map<string, { email: string }>()

    if (userIds.length > 0) {
      try {
        const { data: { users } } = await adminClient.auth.admin.listUsers()
        users?.forEach((user: any) => {
          if (userIds.includes(user.id)) {
            usersMap.set(user.id, { email: user.email || 'Unknown' })
          }
        })
      } catch (authError: any) {
        logger.warn('Error fetching user emails', { error: authError?.message })
      }
    }

    // Filter by search term if provided
    let filteredSessions = authSessions || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredSessions = filteredSessions.filter((session: any) => {
        const userData = usersMap.get(session.user_id)
        return userData?.email?.toLowerCase().includes(searchLower)
      })
    }

    if (userId) {
      filteredSessions = filteredSessions.filter((s: any) => s.user_id === userId)
    }

    // Format response
    const sessionsFormatted = filteredSessions.map((session: any) => ({
      id: session.id,
      user_id: session.user_id,
      email: usersMap.get(session.user_id)?.email || 'Unknown',
      created_at: session.created_at,
      updated_at: session.updated_at,
      refreshed_at: session.refreshed_at,
      not_after: session.not_after,
      ip: session.ip,
      user_agent: session.user_agent
    }))

    logger.info('Sessions retrieved', {
      count: sessionsFormatted.length,
      filters: { userId, search }
    })

    return res.status(200).json({
      success: true,
      data: sessionsFormatted,
      metadata: {
        total: sessionsFormatted.length,
        page,
        pageSize,
        filters: {
          user_id: userId || null,
          search: search || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching sessions', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function revokeSession(
  req: NextApiRequest,
  res: NextApiResponse<SessionsResponse>,
  adminUserId: string
) {
  try {
    const adminClient = createAdminClient()
    const { session_id, user_id } = req.query

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing user_id',
        message: 'User ID is required to revoke session'
      })
    }

    // Sign out the user (revokes all their sessions)
    const { error: signOutError } = await adminClient.auth.admin.signOut(user_id)

    if (signOutError) {
      throw signOutError
    }

    logger.info('Session revoked', {
      userId: user_id,
      sessionId: session_id,
      revokedBy: adminUserId
    })

    return res.status(200).json({
      success: true,
      message: 'Session revoked successfully'
    })
  } catch (error) {
    logger.error('Error revoking session', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke session',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

