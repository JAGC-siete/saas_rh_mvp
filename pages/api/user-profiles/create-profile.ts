import { randomUUID } from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'
import { normalizeCountryCode } from '../../../lib/country/supported'
import { timezoneForCountry } from '../../../lib/country/payroll-labels'
import { createAdminClient } from '../../../lib/supabase/server'

const ONBOARDING_ROLE = 'hr_manager'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user } = await authenticateUser(req, res, { requireProfile: false })

    const {
      company_name,
      company_id,
      country_code: bodyCountryCode,
      employee_id,
    } = req.body

    if (!company_name && !company_id) {
      return res.status(400).json({ error: 'Company name is required' })
    }

    const adminSupabase = createAdminClient()

    const { data: existingProfile } = await adminSupabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      return res.status(409).json({ error: 'User profile already exists' })
    }

    let finalCompanyId = company_id

    if (company_name && !company_id) {
      const cc = normalizeCountryCode(
        typeof bodyCountryCode === 'string' ? bodyCountryCode.toUpperCase() : 'HND'
      )

      const { data: newCompany, error: companyError } = await adminSupabase
        .from('companies')
        .insert([{
          id: randomUUID(),
          name: company_name,
          plan_type: 'trial',
          is_active: true,
          country_code: cc,
          timezone: timezoneForCountry(cc),
          settings: {
            timezone: timezoneForCountry(cc),
            language: 'es',
          },
        }])
        .select('id')
        .single()

      if (companyError) {
        console.error('Error creating company:', companyError)
        return res.status(500).json({ error: 'Failed to create company' })
      }

      finalCompanyId = newCompany.id
    }

    const employeeCode = typeof employee_id === 'string' && employee_id.trim().length > 0
      ? employee_id.trim()
      : 'EMP001'

    const { data: newProfile, error: createError } = await adminSupabase
      .from('user_profiles')
      .insert([{
        id: user.id,
        company_id: finalCompanyId,
        role: ONBOARDING_ROLE,
        permissions: {},
        is_active: true,
      }])
      .select(`
        *,
        employees(name, email, role),
        companies(name, is_active)
      `)
      .single()

    if (createError) {
      console.error('Error creating user profile:', createError)
      return res.status(500).json({ error: 'Failed to create user profile' })
    }

    const normalizedProfile = newProfile
      ? {
          ...newProfile,
          employees: newProfile.employees
            ? {
                ...newProfile.employees,
                role: newProfile.employees.role ?? '',
              }
            : null,
        }
      : newProfile

    if (employeeCode) {
      await adminSupabase.from('company_metadata').upsert({
        company_id: finalCompanyId,
        employees_metadata: {
          employee_id_pattern: employeeCode,
          last_employee_number: 1,
        },
      })
    }

    return res.status(201).json({
      profile: normalizedProfile,
      message: 'User profile created successfully',
      employee_id: employeeCode,
    })
  } catch (error: any) {
    console.error('Create profile API error:', error)

    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return res.status(503).json({ error: 'Server configuration error' })
    }

    return res.status(500).json({
      error: error.message || 'Internal server error',
    })
  }
}
