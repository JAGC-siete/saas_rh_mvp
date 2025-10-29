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
        console.log('🔍 Buscando perfil para usuario:', user.id)
        const response = await fetch('/api/user-profile')
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }
        
        const { data: userProfile } = await response.json()
        console.log('📊 Resultado perfil:', { userProfile })

        if (userProfile) {
          setCompanyId(userProfile.company_id)
          
          // Get company info using client
          const supabase = await createClient()
          const currentCompanyId = userProfile.company_id
          console.log('🏢 Buscando empresa con ID:', currentCompanyId)
          
          if (!currentCompanyId) {
            setError('No se pudo obtener el ID de la empresa')
            setLoading(false)
            return
          }
          
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
        } else {
          setError('No se pudo obtener el perfil de usuario')
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
