import { useState, useEffect } from 'react'
import { createClient } from './supabase/client'
import { useAuth } from './auth'

interface CompanyInfo {
  id: string
  name: string
  settings?: any
}

export function useCompanyContext() {
  const { user, loading: authLoading } = useAuth()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCompanyContext() {
      if (!user || authLoading) {
        setLoading(true)
        return
      }

      try {
        // CONSULTA DIRECTA DESDE CLIENTE (Patrón recomendado por Supabase para SPAs)
        // Respeta RLS con política: id = auth.uid()
        // Si falla, el problema es la política RLS, no que necesitemos bypass
        const supabase = createClient()
        
        if (!supabase) {
          throw new Error('No se pudo inicializar Supabase')
        }
        
        console.log('🔍 [CompanyContext] Consulta directa desde cliente (respeta RLS) para usuario:', user.id)
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('company_id, role, employee_id, permissions')
          .eq('id', user.id)
          .maybeSingle()
        
        console.log('📊 [CompanyContext] Resultado consulta directa:', { 
          userProfile: userProfile ? '✅ Encontrado' : '❌ No encontrado',
          error: profileError ? {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          } : null
        })
        
        if (profileError) {
          // Si falla por RLS, el problema es la política, no que necesitemos bypass
          console.error('❌ [CompanyContext] Error en consulta directa (verificar políticas RLS):', profileError)
          
          // Si es error de RLS (PGRST301), indicar que hay problema con políticas
          if (profileError.code === 'PGRST301' || profileError.message?.includes('permission denied')) {
            setError('Error de permisos: Verifique que las políticas RLS estén correctamente configuradas')
          } else {
            setError('No se pudo obtener el perfil de usuario')
          }
          setLoading(false)
          return
        }
        
        if (!userProfile) {
          console.error('❌ [CompanyContext] Perfil de usuario no encontrado')
          setError('Perfil de usuario no encontrado')
          setLoading(false)
          return
        }
        
        console.log('✅ [CompanyContext] Perfil obtenido correctamente:', userProfile)

        // Verificar que el perfil tiene company_id
        if (!userProfile.company_id) {
          console.error('❌ [CompanyContext] Perfil de usuario no tiene company_id')
          setError('El perfil de usuario no está asociado a ninguna empresa.')
          setLoading(false)
          return
        }
        
        setCompanyId(userProfile.company_id)
        console.log('✅ [CompanyContext] Company ID establecido:', userProfile.company_id)
        
        // Obtener información de la empresa (también respeta RLS)
        const currentCompanyId = userProfile.company_id
        console.log('🏢 [CompanyContext] Buscando empresa con ID:', currentCompanyId)
        
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, settings')
          .eq('id', currentCompanyId)
          .single()
        
        if (companyError) {
          console.error('❌ [CompanyContext] Error obteniendo empresa (verificar políticas RLS):', companyError)
          console.error('❌ [CompanyContext] Detalles del error:', {
            code: companyError.code,
            message: companyError.message,
            details: companyError.details,
            hint: companyError.hint
          })
          // No establecer error aquí, solo loguear - el companyId ya está establecido
          // El usuario puede seguir usando la app aunque no se cargue la info completa de la empresa
        } else {
          console.log('✅ [CompanyContext] Empresa encontrada:', companyData)
          setCompany(companyData)
        }

      } catch (err) {
        console.error('❌ Error en useCompanyContext:', err)
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyContext()
  }, [user, authLoading])

  return {
    companyId,
    company,
    loading: loading || authLoading,
    error
  }
}
