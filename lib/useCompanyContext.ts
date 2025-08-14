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
        const supabase = createClient()
        
        if (!supabase) {
          throw new Error('No se pudo inicializar Supabase')
        }
        
        // Obtener el company_id del user_profile
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('❌ Error obteniendo perfil de usuario:', profileError)
          // Usar Paragon como fallback
          const fallbackCompanyId = '00000000-0000-0000-0000-000000000001'
          console.log('⚠️ Usando company_id fallback:', fallbackCompanyId)
          setCompanyId(fallbackCompanyId)
        } else {
          setCompanyId(userProfile.company_id)
        }

        // Obtener información de la empresa
        const currentCompanyId = profileError ? '00000000-0000-0000-0000-000000000001' : userProfile.company_id
        
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, settings')
          .eq('id', currentCompanyId)
          .single()

        if (companyError) {
          console.error('❌ Error obteniendo empresa:', companyError)
          setError('No se pudo cargar la información de la empresa')
        } else {
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
