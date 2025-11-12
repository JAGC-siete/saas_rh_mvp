import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'

/**
 * API para gestionar configuraciones de payroll por empresa
 * 
 * Permite crear, leer y actualizar configuraciones sin necesidad de deploys
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, role, userProfile } = await requireCompanyAccess(req, res)

    // Para super_admin sin company_id, necesitamos obtener companyId del body o query
    let targetCompanyId = companyId
    if (!targetCompanyId && role === 'super_admin') {
      targetCompanyId = req.body?.company_id || req.query?.company_id as string
      if (!targetCompanyId) {
        return res.status(400).json({
          error: 'Company ID requerido',
          message: 'Para super_admin, debe proporcionar company_id en el body o query'
        })
      }
    }

    if (!targetCompanyId) {
      return res.status(400).json({
        error: 'Perfil de usuario incompleto',
        message: 'No se pudo obtener la información de la empresa'
      })
    }

    // Para super_admin, usar admin client para bypass RLS
    const dbClient = role === 'super_admin' ? createAdminClient() : supabase

    switch (req.method) {
      case 'GET':
        return await getPayrollConfig(dbClient, targetCompanyId, res)

      case 'POST':
      case 'PUT':
        // Solo admins pueden modificar configuraciones
        if (!['super_admin', 'company_admin'].includes(role)) {
          return res.status(403).json({
            error: 'Permisos insuficientes',
            message: 'Solo administradores pueden modificar configuraciones de payroll'
          })
        }
        // Verificar que company_admin solo puede modificar su propia empresa
        if (role === 'company_admin' && companyId && companyId !== targetCompanyId) {
          return res.status(403).json({
            error: 'Permisos insuficientes',
            message: 'Solo puede modificar la configuración de su propia empresa'
          })
        }
        return await upsertPayrollConfig(dbClient, targetCompanyId, req.body, res)

      case 'DELETE':
        // Solo super_admin puede desactivar configuraciones
        if (role !== 'super_admin') {
          return res.status(403).json({
            error: 'Permisos insuficientes',
            message: 'Solo super administradores pueden desactivar configuraciones'
          })
        }
        return await deactivatePayrollConfig(dbClient, targetCompanyId, res)

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Error in payroll config API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
}

/**
 * Obtener configuración de payroll de una empresa
 */
async function getPayrollConfig(
  supabase: any,
  companyId: string,
  res: NextApiResponse
) {
  try {
    const { data, error } = await supabase
      .from('company_payroll_configs')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (error) {
      // Si no existe configuración, retornar null (no es error)
      if (error.code === 'PGRST116') {
        return res.status(200).json({
          config: null,
          message: 'No hay configuración personalizada para esta empresa'
        })
      }

      throw error
    }

    return res.status(200).json({
      config: data,
      message: 'Configuración obtenida exitosamente'
    })
  } catch (error: any) {
    console.error('Error getting payroll config:', error)
    return res.status(500).json({
      error: 'Error obteniendo configuración',
      details: error.message
    })
  }
}

/**
 * Crear o actualizar configuración de payroll
 */
async function upsertPayrollConfig(
  supabase: any,
  companyId: string,
  body: any,
  res: NextApiResponse
) {
  try {
    const {
      calculation_type = 'standard',
      custom_fields = {},
      calculation_config = {},
      calculation_script = null,
      metadata = {}
    } = body

    // Validar calculation_type
    const validTypes = ['standard', 'formula_based', 'custom']
    if (!validTypes.includes(calculation_type)) {
      return res.status(400).json({
        error: 'Tipo de cálculo inválido',
        message: `calculation_type debe ser uno de: ${validTypes.join(', ')}`
      })
    }

    // Validar que si es 'custom', debe tener calculation_script
    if (calculation_type === 'custom' && !calculation_script) {
      return res.status(400).json({
        error: 'Script de cálculo requerido',
        message: 'calculation_script es requerido cuando calculation_type es "custom"'
      })
    }

    // Validar estructura de custom_fields
    if (custom_fields && typeof custom_fields === 'object') {
      for (const [fieldName, fieldDef] of Object.entries(custom_fields)) {
        const def = fieldDef as any
        if (typeof def === 'object') {
          // Validar estructura del campo
          if (!def.label || !def.type || !def.category) {
            return res.status(400).json({
              error: 'Estructura de campo inválida',
              message: `El campo "${fieldName}" debe tener: label, type, category`
            })
          }

          const validTypes = ['number', 'string', 'boolean']
          if (!validTypes.includes(def.type)) {
            return res.status(400).json({
              error: 'Tipo de campo inválido',
              message: `El tipo del campo "${fieldName}" debe ser uno de: ${validTypes.join(', ')}`
            })
          }

          const validCategories = ['earnings', 'deductions', 'calculation_helper']
          if (!validCategories.includes(def.category)) {
            return res.status(400).json({
              error: 'Categoría de campo inválida',
              message: `La categoría del campo "${fieldName}" debe ser una de: ${validCategories.join(', ')}`
            })
          }
        }
      }
    }

    // Upsert configuración
    const { data, error } = await supabase
      .from('company_payroll_configs')
      .upsert({
        company_id: companyId,
        calculation_type,
        custom_fields: custom_fields || {},
        calculation_config: calculation_config || {},
        calculation_script: calculation_script || null,
        metadata: metadata || {},
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.status(200).json({
      config: data,
      message: 'Configuración guardada exitosamente'
    })
  } catch (error: any) {
    console.error('Error upserting payroll config:', error)
    return res.status(500).json({
      error: 'Error guardando configuración',
      details: error.message
    })
  }
}

/**
 * Desactivar configuración de payroll (soft delete)
 */
async function deactivatePayrollConfig(
  supabase: any,
  companyId: string,
  res: NextApiResponse
) {
  try {
    const { data, error } = await supabase
      .from('company_payroll_configs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      // Si no existe, no es error
      if (error.code === 'PGRST116') {
        return res.status(200).json({
          message: 'No existe configuración para desactivar'
        })
      }
      throw error
    }

    return res.status(200).json({
      config: data,
      message: 'Configuración desactivada exitosamente'
    })
  } catch (error: any) {
    console.error('Error deactivating payroll config:', error)
    return res.status(500).json({
      error: 'Error desactivando configuración',
      details: error.message
    })
  }
}

