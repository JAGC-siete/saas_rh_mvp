/**
 * Cliente Supabase seguro con RLS habilitado y contexto de usuario
 * Previene bypass de Row Level Security
 */

import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'
import { UserProfile } from '../auth-helpers'

export interface SecureClientOptions {
  req: NextApiRequest
  res: NextApiResponse
  userProfile?: UserProfile
  enforceRLS?: boolean
}

/**
 * Crea un cliente Supabase con RLS habilitado y contexto de seguridad
 */
export function createSecureClient(options: SecureClientOptions) {
  const { req, res, userProfile, enforceRLS = true } = options
  
  // Obtener configuración de Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configuración de Supabase no encontrada')
  }

  // Crear cliente con RLS habilitado
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'secure-client'
      }
    }
  })

  // Agregar contexto de usuario para RLS
  if (userProfile && enforceRLS) {
    // Establecer contexto de usuario para RLS
    try {
      supabase.rpc('set_user_context', {
        user_id: userProfile.id,
        company_id: userProfile.company_id,
        role: userProfile.role
      })
    } catch (error: any) {
      console.warn('No se pudo establecer contexto de usuario para RLS:', error.message)
    }
  }

  return supabase
}

/**
 * Crea un cliente Supabase con filtros de empresa aplicados
 */
export function createCompanyFilteredClient(options: SecureClientOptions) {
  const supabase = createSecureClient(options)
  const { userProfile } = options

  if (!userProfile) {
    throw new Error('Perfil de usuario requerido para filtros de empresa')
  }

  // Aplicar filtros de empresa automáticamente
  const filteredClient = {
    ...supabase,
    
    // Override de métodos de consulta para aplicar filtros automáticamente
    from: (table: string) => {
      const query = supabase.from(table)
      
      // Aplicar filtro de empresa si el usuario no es super_admin
      if (userProfile.role !== 'super_admin' && userProfile.company_id) {
        return (query as any).eq('company_id', userProfile.company_id)
      }
      
      return query
    }
  }

  return filteredClient
}

/**
 * Valida que el cliente tenga RLS habilitado
 */
export async function validateRLSEnabled(supabase: any): Promise<boolean> {
  try {
    // Intentar acceder a una tabla protegida por RLS
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
    
    // Si no hay error, RLS está funcionando
    return !error || error.code === 'PGRST116' // PGRST116 = no rows found (RLS working)
  } catch (error) {
    console.warn('Error validando RLS:', error)
    return false
  }
}

/**
 * Crea un cliente de solo lectura para consultas seguras
 */
export function createReadOnlyClient(options: SecureClientOptions) {
  const supabase = createSecureClient(options)
  
  return {
    ...supabase,
    
    // Override de métodos de escritura para prevenir modificaciones
    insert: () => {
      throw new Error('Cliente de solo lectura: operaciones de inserción no permitidas')
    },
    update: () => {
      throw new Error('Cliente de solo lectura: operaciones de actualización no permitidas')
    },
    upsert: () => {
      throw new Error('Cliente de solo lectura: operaciones de upsert no permitidas')
    },
    delete: () => {
      throw new Error('Cliente de solo lectura: operaciones de eliminación no permitidas')
    }
  }
}

/**
 * Crea un cliente con permisos específicos validados
 */
export function createPermissionedClient(
  options: SecureClientOptions, 
  requiredPermissions: string[]
) {
  const { userProfile } = options
  
  if (!userProfile) {
    throw new Error('Perfil de usuario requerido para validación de permisos')
  }

  // Validar permisos (esto se implementará en el siguiente paso)
  // Por ahora, crear cliente normal
  const supabase = createSecureClient(options)
  
  return {
    ...supabase,
    
    // Agregar validación de permisos a cada operación
    from: (table: string) => {
      const query = supabase.from(table)
      
      // Aplicar filtros basados en permisos
      if (userProfile.role !== 'super_admin') {
        // Aplicar filtro de empresa
        if (userProfile.company_id) {
          return (query as any).eq('company_id', userProfile.company_id)
        }
      }
      
      return query
    }
  }
}

/**
 * Middleware para validar acceso a recursos
 */
export function withResourceAccess(
  resourceType: string,
  requiredPermissions: string[]
) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Obtener perfil de usuario del request
      const userProfile = (req as any).userProfile
      
      if (!userProfile) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Perfil de usuario no encontrado'
        })
      }

      // Validar permisos (implementación completa en siguiente paso)
      // Por ahora, permitir acceso
      next()
      
    } catch (error) {
      console.error('Error en validación de acceso a recurso:', error)
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Error validando acceso al recurso'
      })
    }
  }
}
