import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get user session from cookies - try multiple cookie names
    const authCookie = req.cookies['sb-access-token'] || req.cookies['sb-refresh-token'] || req.cookies['supabase-auth-token']
    
    console.log('🔍 Available cookies:', Object.keys(req.cookies))
    console.log('🔍 Auth cookie found:', !!authCookie)
    
    if (!authCookie) {
      console.error('❌ No auth cookie found')
      return res.status(401).json({ error: 'Unauthorized - No auth cookie' })
    }

    // Try to get user session
    let user = null
    let authError = null
    
    try {
      // First try with getUser
      const { data: userData, error: userError } = await supabase.auth.getUser(authCookie)
      if (userError) {
        console.log('⚠️ getUser failed, trying getSession...')
        // If getUser fails, try getSession
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('❌ Both getUser and getSession failed:', sessionError)
          authError = sessionError
        } else {
          user = sessionData.session?.user || null
        }
      } else {
        user = userData.user
      }
    } catch (error) {
      console.error('❌ Auth error:', error)
      authError = error
    }
    
    if (authError || !user) {
      console.error('❌ Final auth check failed:', { authError, user: !!user })
      return res.status(401).json({ error: 'Unauthorized - Invalid session' })
    }
    
    console.log('✅ User authenticated:', user.id)

    // Get user profile to determine company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return res.status(500).json({ error: 'Error fetching user profile' })
    }

    if (!profile?.company_id) {
      console.error('No company_id found for user:', user.id)
      return res.status(400).json({ error: 'User not associated with a company' })
    }

    console.log('User profile found:', { userId: user.id, companyId: profile.company_id })

    // Get query parameters
    const { 
      search = '', 
      page = '1', 
      limit = '20',
      status = 'active',
      department_id,
      sort_by = 'name',
      sort_order = 'asc'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build the query
    let query = supabase
      .from('employees')
      .select(`
        *,
        departments!left(name),
        work_schedules!left(name, monday_start, monday_end),
        employee_scores!left(total_points, weekly_points, monthly_points),
        attendance_records!left(check_in, check_out, status)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .eq('status', status)

    // Add search filter if provided
    if (search) {
      query = query.or(`
        name.ilike.%${search}%,
        employee_code.ilike.%${search}%,
        dni.ilike.%${search}%,
        position.ilike.%${search}%,
        email.ilike.%${search}%
      `)
    }

    // Add department filter if provided
    if (department_id) {
      query = query.eq('department_id', department_id)
    }

    // Add sorting
    query = query.order(sort_by as string, { ascending: sort_order === 'asc' })

    // Add pagination
    query = query.range(offset, offset + limitNum - 1)

    const { data: employees, error, count } = await query

    if (error) {
      console.error('Error fetching employees:', error)
      return res.status(500).json({ error: 'Error fetching employees' })
    }

    console.log('Employees query successful:', { 
      count: count || 0, 
      employeesCount: employees?.length || 0,
      companyId: profile.company_id,
      status: status
    })

    // Process attendance data for today
    const today = new Date().toISOString().split('T')[0]
    const processedEmployees = employees?.map((emp: any) => {
      const todayAttendance = emp.attendance_records?.find((att: any) => 
        att.check_in && new Date(att.check_in).toISOString().split('T')[0] === today
      )

      let attendance_status: 'present' | 'absent' | 'late' | 'not_registered' = 'not_registered'
      let check_in_time = undefined
      let check_out_time = undefined

      if (todayAttendance) {
        check_in_time = todayAttendance.check_in
        check_out_time = todayAttendance.check_out
        
        if (check_in_time) {
          const checkInHour = new Date(check_in_time).getHours()
          const checkInMinutes = new Date(check_in_time).getMinutes()
          
          // Check if late (after 8:15 AM)
          if (checkInHour > 8 || (checkInHour === 8 && checkInMinutes > 15)) {
            attendance_status = 'late'
          } else {
            attendance_status = 'present'
          }
        }
      }

      return {
        ...emp,
        attendance_status,
        check_in_time,
        check_out_time
      }
    })

    return res.status(200).json({
      employees: processedEmployees || [],
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil((count || 0) / limitNum),
        totalItems: count || 0,
        itemsPerPage: limitNum
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 