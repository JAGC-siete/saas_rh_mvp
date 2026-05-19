import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import type { FieldAccessContext } from '../security/field-access'

const FAIL_SECURE_SALARY: FieldAccessContext = {
  canViewSalary: false,
  canEditSalary: false,
  salaryDisplayMode: 'masked',
}

/**
 * Loads effective salary field access from GET /api/me/field-access
 * (DB matrix + user overrides). Fail-secure until resolved.
 */
export function useSalaryFieldAccess(): FieldAccessContext & { loading: boolean } {
  const { userProfile } = useAuth()
  const [access, setAccess] = useState<FieldAccessContext>(FAIL_SECURE_SALARY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userProfile?.id) {
      setAccess(FAIL_SECURE_SALARY)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch('/api/me/field-access', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('field-access fetch failed')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const salary = data?.field_access?.salary
        if (
          salary &&
          typeof salary.canViewSalary === 'boolean' &&
          typeof salary.canEditSalary === 'boolean'
        ) {
          setAccess({
            canViewSalary: salary.canViewSalary,
            canEditSalary: salary.canEditSalary,
            salaryDisplayMode: salary.salaryDisplayMode || 'masked',
          })
        } else {
          setAccess(FAIL_SECURE_SALARY)
        }
      })
      .catch(() => {
        if (!cancelled) setAccess(FAIL_SECURE_SALARY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userProfile?.id, userProfile?.role, userProfile?.permissions])

  return { ...access, loading }
}
