import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../lib/supabase/client'
import { useCompanyContext } from '../lib/useCompanyContext'

export default function UserManager({ companyId: propCompanyId }: { companyId?: string }) {
  const { companyId: contextCompanyId, loading: companyLoading } = useCompanyContext()
  
  // Usar companyId de props si está disponible, sino del contexto
  const companyId = propCompanyId || contextCompanyId
  const [users, setUsers] = useState<any[]>([])
  // Form states, etc.

  const fetchUsers = useCallback(async () => {
    const supabaseClient = createClient()
    const { data } = await supabaseClient.from('user_profiles').select('*').eq('company_id', companyId)
    setUsers(data || [])
  }, [companyId])

  useEffect(() => {
    fetchUsers()
  }, [companyId, fetchUsers])

  // Add forms for create/edit user (id, role, permissions, etc.), delete
  // Use supabase.auth.admin for user creation if needed, but for profiles use from('user_profiles')

  return (
    <div>
      {/* Table of users with edit/delete buttons */}
      {/* Form for add/edit */}
      <ul>{users.map((u: any) => <li key={u.id}>{u.email}</li>)}</ul>
    </div>
  )
}
