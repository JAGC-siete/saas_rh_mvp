import { useTranslations } from 'next-intl'
import { normalizeRole } from '../../lib/auth/role-access'
import { companyRoleLabel } from '../../lib/company/users'
import type { NavGroup, NavItem } from '../../lib/navigation/sidebar'

type DynamicKey = Parameters<ReturnType<typeof useTranslations<'nav'>>>[0]

/** Menu labels by id; falls back to the Spanish label in lib/navigation if a key is missing. */
export function useNavLabels() {
  const t = useTranslations('nav')
  const tRoles = useTranslations('roles')
  const byKey = (key: string, fallback: string) => (t.has(key as DynamicKey) ? t(key as DynamicKey) : fallback)
  return {
    item: (item: NavItem) => byKey(`items.${item.id}`, item.label),
    group: (group: NavGroup) => byKey(`groups.${group.id}`, group.label),
    role: (role: unknown) => {
      const key = normalizeRole(role)
      if (!key) return t('defaultUser')
      return tRoles.has(key as Parameters<typeof tRoles>[0])
        ? tRoles(key as Parameters<typeof tRoles>[0])
        : companyRoleLabel(role)
    },
  }
}
