import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useAuth } from '../lib/auth'
import { useCompanyContext } from '../lib/useCompanyContext'
import { companyRoleLabel } from '../lib/company/users'
import { NAVIGATION, filterNavigation, findActiveItem, findGroupOf } from '../lib/navigation/sidebar'
import AppMeshShell from './landing/AppMeshShell'
import HelpButton from './support/HelpButton'
import NotificationBell from './ui/NotificationBell'
import SidebarContent, { type SidebarAccount } from './layout/SidebarContent'
import { useNavPermissions } from './layout/useNavPermissions'
import { useNavBadges } from './layout/useNavBadges'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const COLLAPSED_KEY = 'sisu.sidebar.collapsed'
const GROUPS_KEY = 'sisu.sidebar.groups'
const RAIL_W = 64
const PANEL_W = 256
const PEEK_OPEN_MS = 120
const PEEK_CLOSE_MS = 200

/**
 * Preferencias del menú. Cada página monta su propio DashboardLayout, así que se guardan
 * en localStorage (entre sesiones) y en memoria del módulo (para no parpadear al navegar).
 */
let prefsCache: { collapsed: boolean; groups: Record<string, boolean> } | null = null

function readPrefs() {
  if (prefsCache) return prefsCache
  let collapsed = false
  let groups: Record<string, boolean> = {}
  try {
    collapsed = localStorage.getItem(COLLAPSED_KEY) === '1'
    groups = JSON.parse(localStorage.getItem(GROUPS_KEY) || '{}') || {}
  } catch {
    // localStorage bloqueado (modo privado): valores por defecto
  }
  prefsCache = { collapsed, groups }
  return prefsCache
}

function writePrefs(next: { collapsed: boolean; groups: Record<string, boolean> }) {
  prefsCache = next
  try {
    localStorage.setItem(COLLAPSED_KEY, next.collapsed ? '1' : '0')
    localStorage.setItem(GROUPS_KEY, JSON.stringify(next.groups))
  } catch {
    // sin persistencia: queda en memoria
  }
}

function initialsOf(name: string) {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U'
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, userProfile, logout } = useAuth()
  const { company } = useCompanyContext()

  const { permissions, features, resolving } = useNavPermissions(user?.id, userProfile)
  const nav = useMemo(() => filterNavigation(NAVIGATION, permissions, features, resolving), [permissions, features, resolving])
  const active = findActiveItem(nav, router.asPath || router.pathname)
  const activeGroup = findGroupOf(nav, active?.id)
  const badges = useNavBadges(user?.id, permissions.dashboard !== false)

  // ---- Preferencias (colapsado, grupos abiertos) ----
  const [collapsed, setCollapsed] = useState(() => prefsCache?.collapsed ?? false)
  const [groupPrefs, setGroupPrefs] = useState<Record<string, boolean>>(() => prefsCache?.groups ?? {})
  useEffect(() => {
    const p = readPrefs()
    setCollapsed(p.collapsed)
    setGroupPrefs(p.groups)
  }, [])

  // El grupo de la página actual siempre se muestra abierto.
  const openGroups = useMemo(
    () => (activeGroup ? { ...groupPrefs, [activeGroup.id]: true } : groupPrefs),
    [groupPrefs, activeGroup]
  )

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      writePrefs({ collapsed: next, groups: readPrefs().groups })
      return next
    })
    setPeek(false)
  }, [])

  const toggleGroup = useCallback(
    (groupId: string) => {
      setGroupPrefs((prev) => {
        const next = { ...prev, [groupId]: !(openGroups[groupId] ?? true) }
        writePrefs({ collapsed: readPrefs().collapsed, groups: next })
        return next
      })
    },
    [openGroups]
  )

  // ---- Escritorio: vista previa al pasar el cursor (encima del contenido, sin moverlo) ----
  const [peek, setPeek] = useState(false)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const schedulePeek = (value: boolean, ms: number) => {
    if (peekTimer.current) clearTimeout(peekTimer.current)
    peekTimer.current = setTimeout(() => setPeek(value), ms)
  }
  useEffect(() => () => {
    if (peekTimer.current) clearTimeout(peekTimer.current)
  }, [])
  const expanded = !collapsed || peek

  // ---- Móvil: panel encima del contenido ----
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const onRoute = () => {
      setDrawerOpen(false)
      setPeek(false)
    }
    router.events.on('routeChangeStart', onRoute)
    return () => router.events.off('routeChangeStart', onRoute)
  }, [router.events])

  useEffect(() => {
    if (!drawerOpen) return
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector<HTMLElement>('button, a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      // Siempre se libera: guardar el valor previo falla si el efecto corre dos veces con el panel abierto.
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen, closeDrawer])

  const handleSignOut = async () => {
    await logout()
    router.push('/app/login')
  }

  const displayName = userProfile?.name?.trim() || user?.email || 'Usuario'
  const account: SidebarAccount = {
    name: displayName,
    email: user?.email ?? null,
    roleLabel: companyRoleLabel(userProfile?.role),
    companyName: company?.name ?? null,
    initials: initialsOf(displayName),
  }

  const shared = { nav, activeId: active?.id ?? null, badges, openGroups, onToggleGroup: toggleGroup, account, onSignOut: handleSignOut }

  return (
    <AppMeshShell className="h-screen min-h-0 flex-col lg:flex-row">
      {/* Móvil: barra superior */}
      <header className="z-30 flex shrink-0 items-center gap-2 border-b border-[#1c2740] bg-[#0e1628] px-3 py-2.5 lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#22304d] bg-[#121a2c] text-slate-200"
        >
          <Bars3Icon className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[11px] text-slate-400">{activeGroup?.label ?? 'Humano SISU'}</span>
          <span className="truncate text-base font-bold text-white">{active?.label ?? 'Humano SISU'}</span>
        </div>
        <NotificationBell panelClassName="right-0" />
      </header>

      {/* Escritorio: menú lateral. El contenedor reserva 64 o 256 px; la vista previa se dibuja encima. */}
      <div
        className="relative hidden shrink-0 transition-[width] duration-200 lg:block"
        style={{ width: collapsed ? RAIL_W : PANEL_W }}
      >
        <aside
          aria-label="Menú principal"
          onMouseEnter={() => collapsed && schedulePeek(true, PEEK_OPEN_MS)}
          onMouseLeave={() => collapsed && schedulePeek(false, PEEK_CLOSE_MS)}
          onFocus={() => collapsed && setPeek(true)}
          onBlur={(e) => {
            if (collapsed && !e.currentTarget.contains(e.relatedTarget as Node | null)) setPeek(false)
          }}
          className={`absolute inset-y-0 left-0 z-30 border-r border-[#1c2740] bg-[#0e1628] transition-[width] duration-150 ${
            collapsed && peek ? 'shadow-[16px_0_40px_rgba(0,0,0,0.45)]' : ''
          }`}
          style={{ width: expanded ? PANEL_W : RAIL_W }}
        >
          <SidebarContent
            {...shared}
            variant={expanded ? 'full' : 'rail'}
            headerAction={{ kind: collapsed ? 'pin' : 'collapse', onClick: toggleCollapsed }}
            notificationPanelClassName="left-full right-auto bottom-0 mt-0 ml-3"
          />
        </aside>
      </div>

      {/* Móvil: panel del menú */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full bg-slate-950/70"
          />
          <aside
            id="mobile-nav"
            ref={drawerRef}
            aria-label="Menú principal"
            className="absolute inset-y-0 left-0 w-[304px] max-w-[85vw] border-r border-[#1c2740] bg-[#0e1628] shadow-2xl"
          >
            <SidebarContent {...shared} variant="full" touch headerAction={{ kind: 'close', onClick: closeDrawer }} />
          </aside>
        </div>
      )}

      <main className="relative z-10 min-h-0 min-w-0 flex-1 overflow-auto px-4 py-5 lg:px-8 lg:py-6">{children}</main>

      <HelpButton />
    </AppMeshShell>
  )
}
