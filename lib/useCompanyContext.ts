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
        const supabase = await createClient()
        
        // Obtener el company_id del user_profile
        console.log('🔍 Buscando perfil para usuario:', user.id)
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .single()
        
        console.log('📊 Resultado perfil:', { userProfile, profileError })

        if (profileError) {
          console.error('❌ Error obteniendo perfil de usuario:', profileError)
          // No usar fallback hardcodeado - esto causa problemas
          setError('No se pudo obtener el perfil de usuario')
          setLoading(false)
          return
        } else {
          setCompanyId(userProfile.company_id)
        }

        // Obtener información de la empresa
        const currentCompanyId = userProfile.company_id
        console.log('🏢 Buscando empresa con ID:', currentCompanyId)
        
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, settings')
          .eq('id', currentCompanyId)
          .single()
        
        console.log('📊 Resultado empresa:', { companyData, companyError })

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
