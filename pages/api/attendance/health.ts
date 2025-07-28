import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: 'Missing environment variables',
        envCheck
      })
    }

    // Test Supabase connection
    const supabase = createAdminClient()

    // Test basic connection
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1)

    if (companiesError) {
      return res.status(500).json({
        error: 'Database connection failed',
        details: companiesError.message,
        code: companiesError.code,
        envCheck
      })
    }

    // Test employees table
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, dni, status')
      .eq('status', 'active')
      .limit(5)

    if (employeesError) {
      return res.status(500).json({
        error: 'Employees table query failed',
        details: employeesError.message,
        code: employeesError.code,
        envCheck
      })
    }

    // Test attendance table
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('id, employee_id, date')
      .limit(5)

    if (attendanceError) {
      return res.status(500).json({
        error: 'Attendance table query failed',
        details: attendanceError.message,
        code: attendanceError.code,
        envCheck
      })
    }

    return res.status(200).json({
      status: 'healthy',
      message: 'All database connections working',
      data: {
        companiesCount: companies?.length || 0,
        employeesCount: employees?.length || 0,
        attendanceCount: attendance?.length || 0,
        sampleEmployee: employees?.[0] ? {
          id: employees[0].id,
          name: employees[0].name,
          dniLast5: employees[0].dni?.slice(-5)
        } : null
      },
      envCheck
    })

  } catch (error: any) {
    console.error('Health check error:', error)
    return res.status(500).json({
      error: 'Health check failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
