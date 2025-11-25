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
        // Get user profile via API (bypasses RLS on server side)
        console.log('🔍 [CompanyContext] Buscando perfil para usuario:', user.id, 'Rol:', user.user_metadata?.role)
        const response = await fetch('/api/user-profile')
        
        if (!response.ok) {
          const errorBody = await response.text()
          console.error('❌ [CompanyContext] Falló la obtención del perfil de usuario. Status:', response.status, 'Body:', errorBody)
          throw new Error(`Failed to fetch user profile: ${response.status}`)
        }
        
        const { data: userProfile } = await response.json()
        console.log('📊 [CompanyContext] Perfil de usuario obtenido:', userProfile)

        if (userProfile && userProfile.company_id) {
          setCompanyId(userProfile.company_id)
          
          // Get company info using client
          const supabase = createClient() // No necesita await
          const currentCompanyId = userProfile.company_id
          console.log('🏢 [CompanyContext] Buscando empresa con ID:', currentCompanyId)
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('id, name, settings')
            .eq('id', currentCompanyId)
            .single()
          
          if (companyError) {
            console.error('❌ [CompanyContext] Error obteniendo empresa desde Supabase:', companyError)
            setError('No se pudo cargar la información de la empresa. Verifique los permisos (RLS).')
          } else {
            console.log('✅ [CompanyContext] Empresa encontrada:', companyData)
            setCompany(companyData)
          }
        } else {
          console.error('❌ [CompanyContext] Perfil de usuario no tiene un company_id o el perfil es nulo.')
          setError('El perfil de usuario no está asociado a ninguna empresa.')
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
