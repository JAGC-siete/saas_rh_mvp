import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { createAdminClient } from '../../../lib/supabase/server'
import { getCompanyData, addCompanyToInsertData } from '../../../lib/helpers/company-filter'
import { resolveFieldAccessContext } from '../../../lib/security/field-access'
import { buildDepartmentStatsPayload } from '../../../lib/security/shape-departments'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, userProfile } = await requireCompanyAccess(req, res)

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    switch (req.method) {
      case 'GET':
        // Get departments
        const { data: departments, error: fetchError } = await getCompanyData(
          supabase,
          'departments',
          companyId,
          '*'
        ).order('name')

        if (fetchError) throw fetchError

        const salaryClient = createEmployeeSalaryClient()
        const adminClient = createAdminClient()
        const fieldCtx = await resolveFieldAccessContext(userProfile, adminClient)

        // Get employees for each department to calculate stats (service role: salary columns revoked for JWT)
        const { data: employees, error: empError } = await getCompanyData(
          salaryClient,
          'employees',
          companyId,
          'id, name, base_salary, department_id, status'
        ).eq('status', 'active')

        if (empError) throw empError
        const { departmentStats, summary } = buildDepartmentStatsPayload(
          departments,
          employees,
          fieldCtx
        )

        return res.json({
          departments,
          departmentStats,
          summary,
        })

      case 'POST':
        const { name, description, manager_id } = req.body
        
        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'El nombre del departamento es requerido' })
        }

        const trimmedName = name.trim()

        // Validate name length
        if (trimmedName.length < 2) {
          return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' })
        }

        if (trimmedName.length > 100) {
          return res.status(400).json({ error: 'El nombre no puede exceder 100 caracteres' })
        }

        // Validate description length
        if (description && description.length > 500) {
          return res.status(400).json({ error: 'La descripción no puede exceder 500 caracteres' })
        }

        // Check for duplicate department names within the company
        const { data: existingDept } = await getCompanyData(
          supabase,
          'departments',
          companyId,
          'id, name'
        ).ilike('name', trimmedName)

        if (existingDept && existingDept.length > 0) {
          return res.status(409).json({ error: 'Ya existe un departamento con este nombre' })
        }

        // Validate manager exists if provided
        if (manager_id) {
          const { data: manager } = await getCompanyData(
            supabase,
            'employees',
            companyId,
            'id, name, status'
          ).eq('id', manager_id).eq('status', 'active')

          if (!manager || manager.length === 0) {
            return res.status(400).json({ error: 'El manager seleccionado no existe o no está activo' })
          }
        }

        const insertData = addCompanyToInsertData({
          name: trimmedName,
          description: description?.trim() || null,
          manager_id: manager_id || null
        }, companyId)

        const { data: newDept, error: createError } = await supabase
          .from('departments')
          .insert(insertData)
          .select()
          .single()

        if (createError) {
          console.error('Department creation error:', createError)
          
          // Handle specific database errors
          if (createError.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un departamento con este nombre' })
          }
          
          throw createError
        }
        
        return res.status(201).json({ department: newDept })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Departments API error:', error)
    
    // Handle specific authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }
    if (error.message === 'COMPANY_ACCESS_REQUIRED') {
      return res.status(400).json({ error: 'Company access required. Please contact administrator to assign you to a company.' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}