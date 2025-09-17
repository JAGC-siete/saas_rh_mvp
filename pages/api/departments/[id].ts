import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { getCompanyData } from '../../../lib/helpers/company-filter'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    const { id } = req.query

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    switch (req.method) {
      case 'PUT':
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

        // Check if department exists
        const { data: existingDept } = await getCompanyData(
          supabase,
          'departments',
          companyId,
          'id, name'
        ).eq('id', id)

        if (!existingDept || existingDept.length === 0) {
          return res.status(404).json({ error: 'Departamento no encontrado' })
        }

        // Check for duplicate department names within the company (excluding current department)
        const { data: duplicateDept } = await getCompanyData(
          supabase,
          'departments',
          companyId,
          'id, name'
        ).ilike('name', trimmedName).neq('id', id)

        if (duplicateDept && duplicateDept.length > 0) {
          return res.status(409).json({ error: 'Ya existe otro departamento con este nombre' })
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

        const { data: updatedDept, error: updateError } = await supabase
          .from('departments')
          .update({ 
            name: trimmedName, 
            description: description?.trim() || null,
            manager_id: manager_id || null
          })
          .eq('id', id)
          .eq('company_id', companyId)
          .select()
          .single()

        if (updateError) {
          console.error('Department update error:', updateError)
          
          // Handle specific database errors
          if (updateError.code === '23505') {
            return res.status(409).json({ error: 'Ya existe otro departamento con este nombre' })
          }
          
          throw updateError
        }
        
        return res.json({ department: updatedDept })

      case 'DELETE':
        // Check if department exists
        const { data: deptToDelete } = await getCompanyData(
          supabase,
          'departments',
          companyId,
          'id, name'
        ).eq('id', id)

        if (!deptToDelete || deptToDelete.length === 0) {
          return res.status(404).json({ error: 'Departamento no encontrado' })
        }

        // Check if department has employees assigned
        const { data: assignedEmployees } = await getCompanyData(
          supabase,
          'employees',
          companyId,
          'id, name'
        ).eq('department_id', id).eq('status', 'active')

        if (assignedEmployees && assignedEmployees.length > 0) {
          return res.status(409).json({ 
            error: `No se puede eliminar el departamento porque tiene ${assignedEmployees.length} empleado${assignedEmployees.length > 1 ? 's' : ''} asignado${assignedEmployees.length > 1 ? 's' : ''}. Primero reasigne o elimine los empleados.`,
            employeeCount: assignedEmployees.length
          })
        }

        const { error: deleteError } = await supabase
          .from('departments')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId)

        if (deleteError) {
          console.error('Department deletion error:', deleteError)
          throw deleteError
        }
        
        return res.status(204).end()

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Department API error:', error)
    
    // Handle specific authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'No autorizado' })
    }
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'Perfil de usuario requerido' })
    }
    if (error.message === 'COMPANY_ACCESS_REQUIRED') {
      return res.status(400).json({ error: 'Acceso a la empresa requerido. Contacte al administrador para que le asigne a una empresa.' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    })
  }
}
