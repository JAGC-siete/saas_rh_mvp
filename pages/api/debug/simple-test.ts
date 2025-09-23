import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 DEBUG - Simple test endpoint called')
    
    // Test authentication
    const { supabase, companyId, user } = await requireCompanyAccess(req, res)
    
    console.log('🔍 DEBUG - Authentication successful:', { 
      userId: user?.id, 
      companyId,
      userEmail: user?.email 
    })

    // Test basic database connection
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    console.log('🔍 DEBUG - Database test result:', { testData, testError })

    // Test employees query
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, status')
      .eq('company_id', companyId)
      .limit(5)

    console.log('🔍 DEBUG - Employees test result:', { 
      employeesCount: employees?.length, 
      empError 
    })

    return res.status(200).json({
      success: true,
      authentication: {
        userId: user?.id,
        userEmail: user?.email,
        companyId
      },
      database: {
        company: {
          found: !!testData,
          data: testData,
          error: testError
        },
        employees: {
          count: employees?.length || 0,
          sample: employees?.slice(0, 3),
          error: empError
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('🔍 DEBUG - Simple test error:', error)
    return res.status(500).json({ 
      error: 'Simple test failed',
      message: error.message,
      stack: error.stack
    })
  }
}
